const flowsTabs = {
  dashboard: (path: string, key: string) => {
    return {
      path: `${path}/${key.toLocaleLowerCase()}`,
      label: key,
    }
  },
}

export default flowsTabs
