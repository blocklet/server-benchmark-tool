/**
 * 替换 apis 中所有字段中出现的 $$key 为 data[key] 的值
 * @param {Array} apis - 接口列表
 * @param {Object} data - 替换的数据对象
 * @returns {Array} 替换后的 apis
 */
function replaceApiPlaceholders(apis, data) {
  function replaceInValue(val) {
    if (typeof val === 'string') {
      return val.replace(/\$\$(\w+)/g, (_, key) => data[key] || '');
    }
    if (Array.isArray(val)) {
      return val.map(replaceInValue);
    }
    if (typeof val === 'object' && val !== null) {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      return replaceInObject(val);
    }
    return val;
  }

  function replaceInObject(obj) {
    const result = {};
    // eslint-disable-next-line no-restricted-syntax, guard-for-in
    for (const key in obj) {
      result[key] = replaceInValue(obj[key]);
    }
    return result;
  }

  return apis.map(replaceInObject);
}

module.exports = replaceApiPlaceholders;
