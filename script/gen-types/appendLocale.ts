import { formatTo } from './utils';
import { langType, langs } from './var';

type appends = {
  type: langType,
  name: string,
  items: { [x: string]: string }
};

const appendLocale: appends[] = [];
['if', 'while'].forEach(it => {
  const data: appends = {
    type: 'FUNC',
    name: it,
    items: {}
  };
  const name = formatTo(it, 'ToFormat');
  langs.forEach(lang => data.items[lang] = name);
  appendLocale.push(data);
});
['else', 'end'].forEach(it => {
  const data: appends = {
    type: 'CONST',
    name: it,
    items: {}
  };
  const name = formatTo(it, 'ToFormat');
  langs.forEach(lang => data.items[lang] = name);
  appendLocale.push(data);
});

export default appendLocale;