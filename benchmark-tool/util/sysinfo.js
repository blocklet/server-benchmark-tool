const SysInfo = require('systeminformation');

const getSysInfo = async () => {
  const info = await SysInfo.get({
    cpu: 'physicalCores',
    currentLoad: '*',
    mem: '*',
    osInfo: 'platform',
  });

  return {
    cpu: {
      ...info.currentLoad,
      ...info.cpu,
      cores: (info.currentLoad?.cpus || []).length || info.cpu?.physicalCores,
    },
    mem: info.mem,
    os: info.osInfo,
  };
};

module.exports.getSysInfo = getSysInfo;
