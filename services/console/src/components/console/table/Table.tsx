import type { Params } from "astro";
import {
	type Accessor,
	For,
	Match,
	type Resource,
	Show,
	Switch,
} from "solid-js";
import { BRANCH_ICON } from "../../../config/project/branches";
import { TESTBED_ICON } from "../../../config/project/testbeds";
import { Row } from "../../../config/types";
import { fmtDateTime } from "../../../config/util";
import {
	AlertStatus,
	type JsonReport,
	type Slug,
} from "../../../types/bencher";
import { fmtValues } from "../../../util/resource";
import { BACK_PARAM, encodePath, pathname } from "../../../util/url";
import { ReportRowFields } from "../perf/plot/tab/ReportsTab";
import FallbackTable from "./FallbackTable";

export enum TableState {
	LOADING = 0,
	EMPTY = 1,
	OK = 2,
	END = 3,
	ERR = 4,
}

export interface Props {
	config: TableConfig;
	state: Accessor<TableState>;
	tableData: Resource<object[]>;
	start_date: Accessor<undefined | string>;
	end_date: Accessor<undefined | string>;
	search: Accessor<undefined | string>;
	page: Accessor<number>;
	handlePage: (page: number) => void;
}

export interface TableConfig {
	url: (params: Params) => string;
	name: string;
	add?: AddButtonConfig;
	row: RowConfig;
}

const Table = (props: Props) => {
	return (
		<Switch fallback={<p>ERROR: Unknown table state</p>}>
			<Match when={props.state() === TableState.LOADING}>
				<FallbackTable />
			</Match>

			<Match when={props.state() === TableState.EMPTY}>
				<Show
					when={
						props.config?.add &&
						!props.start_date() &&
						!props.end_date() &&
						!props.search()
					}
					fallback={<p>🐰 No {props.config?.name} found</p>}
				>
					<AddButton config={props.config?.add as AddButtonConfig} />
				</Show>
			</Match>

			<Match when={props.state() === TableState.OK}>
				<For each={props.tableData()}>
					{(datum, _i) => (
						<a
							class="box"
							style="margin-bottom: 1rem;"
							href={rowHref(props.config?.row?.button, datum)}
							onMouseDown={(_e) => rowEffect(props.config?.row?.button, datum)}
						>
							<Switch fallback={rowText(props.config?.row, datum)}>
								<Match when={datum?.status === AlertStatus.Active}>
									<span class="icon-text">
										<span class="icon has-text-primary">
											<i class="far fa-bell" />
										</span>
										<span>{rowText(props.config?.row, datum)}</span>
									</span>
								</Match>
								<Match
									when={
										datum?.status === AlertStatus.Dismissed ||
										datum?.status === AlertStatus.Silenced
									}
								>
									<span class="icon-text">
										<span class="icon">
											<i class="far fa-bell-slash" />
										</span>
										<span>{rowText(props.config?.row, datum)}</span>
									</span>
								</Match>
								<Match when={props.config?.row?.kind === Row.REPORT}>
									<ReportRowFields report={datum as JsonReport} />
								</Match>
							</Switch>
						</a>
					)}
				</For>
			</Match>

			<Match when={props.state() === TableState.END}>
				<div class="box">
					<BackButton
						name={props.config?.name}
						page={props.page}
						handlePage={props.handlePage}
					/>
				</div>
			</Match>

			<Match when={props.state() === TableState.ERR}>
				<LogoutButton />
			</Match>
		</Switch>
	);
};

export interface AddButtonConfig {
	prefix: Element;
	path: (pathname: string) => string;
	text: string;
}

const AddButton = (props: {
	config: AddButtonConfig;
}) => {
	return (
		<>
			<div class="content has-text-centered">{props.config?.prefix}</div>
			<a
				class="button is-primary is-fullwidth"
				href={`${props.config?.path?.(
					pathname(),
				)}?${BACK_PARAM}=${encodePath()}`}
			>
				{props.config?.text}
			</a>
		</>
	);
};

export interface RowConfig {
	kind?: Row;
	key: string;
	keys?: string[][];
	items: ItemConfig[];
	button: RowsButtonConfig;
}

export interface ItemConfig {
	kind: Row;
	key?: string;
	keys?: string[];
	text?: string;
	value?: { options: { option: string; value: string }[] };
}

export interface RowsButtonConfig {
	text: string;
	path: (pathname: string, datum: { [slug: string]: Slug }) => string;
	effect: (datum: { [slug: string]: Slug }) => void;
}

const rowText = (config: RowConfig, datum: Record<string, string>) => {
	if (config?.kind === Row.DATE_TIME && config?.key) {
		return fmtDateTime(datum[config?.key] ?? "");
	}
	return fmtValues(datum, config?.key, config?.keys, " | ");
};

const rowHref = (config: RowsButtonConfig, datum: Record<string, string>) =>
	`${config?.path?.(pathname(), datum)}?${BACK_PARAM}=${encodePath()}`;

const rowEffect = (config: RowsButtonConfig, datum: Record<string, string>) =>
	config?.effect?.(datum);

const BackButton = (props: {
	name: string;
	page: Accessor<number>;
	handlePage: (page: number) => void;
}) => {
	return (
		<button
			class="button is-primary is-fullwidth"
			type="button"
			onMouseDown={(e) => {
				e.preventDefault();
				props.handlePage(props.page() - 1);
			}}
		>
			That's all the {props.name}. Go back.
		</button>
	);
};

const LogoutButton = () => {
	return (
		<>
			<div class="content has-text-centered">Failed to fetch data...</div>
			<div class="columns is-centered">
				<div class="column is-one-third">
					<a class="button is-primary is-fullwidth" href="/auth/logout">
						Log out
					</a>
				</div>
			</div>
		</>
	);
};

export default Table;
