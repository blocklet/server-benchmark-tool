function replaceApiPrefix(apis, replaceApi) {
  Object.entries(replaceApi).forEach(([key, value]) => {
    apis.forEach((api) => {
      if (key.startsWith('^')) {
        const realkey = key.slice(1);
        if (api.api.startsWith(realkey)) {
          api.api = api.api.replace(realkey, value);
        }
      } else if (api.api.indexOf(key) !== -1) {
        api.api = api.api.replace(key, value);
      }
    });
  });
}

module.exports = replaceApiPrefix;
