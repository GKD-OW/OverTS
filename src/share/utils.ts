function upperFirse(str: string) {
  return str.substr(0, 1).toUpperCase() + str.substr(1);
}

export function formatTo(from: string, toFormat: 'TO_FORMAT' | 'toFormat' | 'ToFormat') {
  // 检测当前的格式，统一转换为以空格分隔的小写命名
  let formatted = from;
  formatted = formatted.replace(/([\._\-])/g, ' ');
  // 本身就是全大写的，转化为小写
  if (/^([A-Z ]+)$/.test(formatted)) {
    formatted = formatted.toLowerCase();
  }
  // 本身已经是驼峰命名了
  if (/^(\w+)$/.test(formatted)) {
    formatted = formatted.replace(/([A-Z])/g, ' $1');
  }
  const formattedArr = formatted.toLowerCase().trim().split(' ');
  // 转化为目标
  if (toFormat === 'TO_FORMAT') {
    return formattedArr.join('_').toUpperCase();
  }
  if (toFormat === 'toFormat') {
    return formattedArr[0] + formattedArr.splice(1).map(it => upperFirse(it)).join('');
  }
  if (toFormat === 'ToFormat') {
    return formattedArr.map(it => upperFirse(it)).join('');
  }
  return formatted;
}
