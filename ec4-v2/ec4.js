/*
MIT License

Copyright (c) 2019 Peter Witzel, faderfox-editor

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
'use strict';
let isDirty = false;

const MEMORY_SIZE = 0xf500;
const MEMORY_OFFSET = 0x0b00;

const MEM = {
  data: new Uint8Array(MEMORY_SIZE),
  lengthGroup: 192,
  lengthSetup: 192 * 16,
  lengthGroupKey1: 16,
  lengthGroupKey2: 32,
  lengthSetupKey1: 16 * 16,
  lengthSetupKey2: 32 * 16,
  addrKey1: 0x0b00 - MEMORY_OFFSET,
  addrSetupNames: 0x1bc0 - MEMORY_OFFSET,
  addrGroupNames: 0x1c00 - MEMORY_OFFSET,
  addrPresets: 0x2000 - MEMORY_OFFSET,
  addrKey2: 0xe000 - MEMORY_OFFSET,
  clipboardDataGroup: null,
  clipboardDataSetup: {
    groupNames: undefined,
    setupData: undefined,
  },
};

const FACTORY_PRESET_PATH = 'factory-preset.syx';

class Selection {
  constructor(updatecallback) {
    this.s = 0;
    this.g = 0;
    this.e = 0;
    this._lastFocused = null;
    this.updatecallback = updatecallback;
  }

  setAll(setup, group, encoder) {
    this.s = setup;
    this.g = group;
    this.e = encoder;
    this.updatecallback(this);
  }

  get setup() {
    return this.s;
  }

  set setup(n) {
    const v = parseInt(n);
    if (v !== this.s) {
      this.s = v;
      this.updatecallback(this);
    }
  }

  get group() {
    return this.g;
  }

  set group(n) {
    this.g = parseInt(n);
    this.updatecallback(this);
  }

  get encoder() {
    return this.e;
  }

  set encoder(n) {
    this.e = parseInt(n);
    this.updatecallback(this);
  }

  set lastFocused(s) {
    this._lastFocused = s;
  }

  get lastFocused() {
    return this._lastFocused;
  }
}

const P = {
  // P is short for Parameter
  type: 'type',
  channel: 'channel',
  number: 'number',
  number_h: 'number_h',
  lower: 'lower',
  upper: 'upper',
  lower_msb: 'lower_msb',
  upper_msb: 'upper_msb',
  mode: 'mode',
  scale: 'scale',
  name: 'name',
  link: 'link',
  pb_channel: 'pb_channel',
  pb_display: 'pb_display',
  pb_type: 'pb_type',
  pb_mode: 'pb_mode',
  pb_number: 'pb_number',
  pb_lower: 'pb_lower',
  pb_upper: 'pb_upper',
  pb_link: 'pb_link',

  labels: {
    type: 'Type',
    channel: 'Channel',
    number: 'Number',
    number_note: 'Numb/Note',
    number_h: 'MSB',
    number_nrpn: '#MSB/LSB',
    lower: 'Lower',
    upper: 'Upper',
    mode: 'Mode',
    scale: 'Display',
    pb_channel: 'Channel',
    pb_display: 'Display',
    pb_type: 'Type',
    pb_mode: 'Mode',
    pb_number: 'Number',
    pb_lower: 'Lower',
    pb_upper: 'Upper',
  },

  _dataFormat: {
    type: { pos: 0, mask: 0xf0, lsb: 4, min: 0, max: 8, default: 2 },
    channel: { pos: 0, mask: 0x0f },
    number: { pos: 16, mask: 0x7f },
    number_h: { pos: 32, mask: 0xff },
    link: {
      pos: 16,
      mask: 0x80,
      lsb: 7,
    },
    lower: { pos: 48, mask: 0xff },
    upper: { pos: 64, mask: 0xff },
    lower_msb: { pos: 96, mask: 0x0f },
    upper_msb: { pos: 96, mask: 0xf0, lsb: 4 },
    mode: {
      pos: 80,
      mask: 0xf0,
      lsb: 4,
      min: 0,
      max: 9,
      default: 3,
    },
    scale: {
      pos: 80,
      mask: 0x0f,
      min: 0,
      max: 8,
      default: 1,
    },
    name: { pos: 128 },
    pb_mode: {
      pos: 0,
      mask: 0x80,
      lsb: 7,
      memstart: MEM.addrKey1,
      grouplen: MEM.lengthGroupKey1,
    },
    pb_number: {
      pos: 0,
      mask: 0x7f,
      memstart: MEM.addrKey1,
      grouplen: MEM.lengthGroupKey1,
    },
    pb_type: {
      pos: 112,
      mask: 0xf0,
      lsb: 4,
    },
    pb_channel: {
      pos: 112,
      mask: 0x0f,
    },
    pb_display: {
      memstart: MEM.addrKey2,
      pos: 0,
      grouplen: MEM.lengthGroupKey2,
      mask: 0x80,
      lsb: 7,
    },
    pb_lower: {
      memstart: MEM.addrKey2,
      pos: 0,
      mask: 0x7f,
      grouplen: MEM.lengthGroupKey2,
    },
    pb_link: {
      memstart: MEM.addrKey2,
      pos: 16,
      grouplen: MEM.lengthGroupKey2,
      mask: 0x80,
      lsb: 7,
    },
    pb_upper: {
      memstart: MEM.addrKey2,
      pos: 16,
      mask: 0x7f,
      grouplen: 32,
    },
  },

  _getMemAddr: function (spec, selection) {
    let startAddr = 'memstart' in spec ? spec.memstart : MEM.addrPresets;
    let lengthGroup = 'grouplen' in spec ? spec.grouplen : MEM.lengthGroup;
    return (
      startAddr +
      (selection.setup * 16 + selection.group) * lengthGroup +
      spec.pos
    );
  },

  get: function (selection, encoder, type) {
    if (type === 'select-encoder') {
      return;
    }

    const spec = P._dataFormat[type];
    if (!spec) {
      console.log('Get unknown parameter type: ' + type);
      return;
    }
    let addr = P._getMemAddr(spec, selection);
    // MEM.addrPresets + (setup * 16 + group) * MEM.lengthGroup + spec.pos;

    if (type === P.name) {
      addr += encoder * 4;
      return P.stringFromPosition(MEM.data, addr);
    } else {
      addr += encoder;
      const shift = spec.lsb || 0;
      if (spec.mask != 0xff) {
        let val = MEM.data[addr] & spec.mask;
        val = val >> shift;
        if (spec.hasOwnProperty('min')) {
          if (val < spec.min || val > spec.max) {
            val = spec.default;
          }
        }
        if (type === P.channel || type === P.pb_channel) val++;
        return val;
      } else {
        return MEM.data[addr];
      }
    }
  },
  set: function (selection, encoder, type, value) {
    const spec = P._dataFormat[type];
    if (!spec) {
      console.log('Set unknown parameter type: ' + type);
      return;
    }
    let addr = P._getMemAddr(spec, selection);
    // MEM.addrPresets + (setup * 16 + group) * MEM.lengthGroup + spec.pos;
    if (type === P.name) {
      addr += encoder * 4;
      while (value.length < 4) {
        value += ' ';
      }
      for (let i = 0; i < 4; i++) {
        const oldValue = MEM.data[addr + i];
        MEM.data[addr + i] = value.charCodeAt(i);
        isDirty = isDirty | (MEM.data[addr + i] != oldValue);
      }
    } else {
      addr += encoder;
      const oldValue = MEM.data[addr];
      value = parseInt(value);
      if (type === P.channel || type === P.pb_channel) value--;
      const shift = spec.lsb || 0;
      if (spec.mask != 0xff) {
        const invMask = 0xff ^ spec.mask;
        value = (value & (spec.mask >> shift)) << shift;
        MEM.data[addr] = (MEM.data[addr] & invMask) | value;
      } else {
        value = value & 0xff; // ensure 8 bit
        MEM.data[addr] = value;
      }
      isDirty = isDirty | (MEM.data[addr] != oldValue);
    }
  },
  setSetupName: function (setupNumber, name) {
    while (name.length < 4) {
      name += ' ';
    }
    const addr = MEM.addrSetupNames + setupNumber * 4;
    for (let i = 0; i < 4; i++) {
      MEM.data[addr + i] = name.charCodeAt(i);
    }
  },
  setGroupName: function (setupNumber, groupNumber, name) {
    while (name.length < 4) {
      name += ' ';
    }
    const addr = MEM.addrGroupNames + setupNumber * 64 + groupNumber * 4;
    for (let i = 0; i < 4; i++) {
      MEM.data[addr + i] = name.charCodeAt(i);
    }
  },
  getGroupName: function (setupNumber, groupNumber) {
    return P.stringFromPosition(
      MEM.data,
      MEM.addrGroupNames + setupNumber * 64 + groupNumber * 4
    );
  },
  getSetupName: function (setupNumber) {
    return P.stringFromPosition(MEM.data, MEM.addrSetupNames + setupNumber * 4);
  },
  stringFromPosition: function (data, position) {
    const characters = data.subarray(position, position + 4);
    return String.fromCharCode(...characters);
  },
};

function initialiseValues() {
  MEM.data.fill(0);
  for (let setup = 0; setup < 16; setup++) {
    const name = `SE${(setup < 9 ? '0' : '') + (setup + 1)}`;
    P.setSetupName(setup, name);
    for (let group = 0; group < 16; group++) {
      const name = `GR${(group < 9 ? '0' : '') + (group + 1)}`;
      P.setGroupName(setup, group, name);
      const selection = { setup: setup, group: group };
      for (let encoder = 0; encoder < 16; encoder++) {
        const name = `EC${(encoder < 9 ? '0' : '') + (encoder + 1)}`;
        P.set(selection, encoder, P.name, name);
        P.set(selection, encoder, P.channel, group + 1);
        P.set(selection, encoder, P.scale, 1);
        P.set(selection, encoder, P.type, 2);
        P.set(selection, encoder, P.mode, 3);
        P.set(selection, encoder, P.upper, 127);
        P.set(selection, encoder, P.link, 0);
      }
    }
  }
  isDirty = false;
}
initialiseValues();

const REnameChars = new RegExp('[A-Za-z0-9.\\-/ ]');
const REnotNameChars = new RegExp('[^A-Za-z0-9.\\-/ ]');
const REnumberChars = new RegExp('[0-9]');

class InputHandler {
  constructor(selection) {
    this.selection = selection;
  }

  checkNameKey(e, element, what) {
    let allowed = true;
    if (e.key.length === 1) {
      if (!REnameChars.test(e.key)) {
        allowed = false;
      }
    }
    if (!allowed) {
      e.preventDefault();
    }
    return allowed;
  }

  checkNumberKey(e, element, what) {
    let allowed = true;
    if (e.key.length === 1) {
      if (!REnumberChars.test(e.key)) {
        allowed = false;
      }
    }
    if (!allowed) {
      e.preventDefault();
    }
    return allowed;
  }

  static checkValue(element, what) {
    let value = element.value;
    switch (what) {
      case P.channel:
      case P.pb_channel:
        if (value < 1) value = 1;
        else if (value > 16) value = 16;
        break;

      case P.number:
        if (
          DOM.ancestorAttribute(element, 'data-type') == 4 /*CC14bit*/ &&
          value > 31
        ) {
          value = 31;
        }
      // runs intentionally on
      case P.number_h:
      case P.lower:
      case P.upper:
      case P.pb_number:
      case P.pb_lower:
      case P.pb_upper:
        if (
          DOM.ancestorAttribute(element, 'data-highres') == 1 &&
          what.indexOf('pb_') == -1
        ) {
          if (value < 0) {
            value = 0;
          } else if (value > 4095) {
            value = 16383;
          }
        } else {
          if (value < 0) value = 0;
          else if (value > 127) value = 127;
        }
        break;
    }
    element.value = value;
  }

  distributeValue(element, what) {
    let updateDisplayValues = false;
    if (what === 'name-setup') {
      const setupNumber = element.getAttribute('data-number');
      P.setSetupName(setupNumber, element.value);
    } else if (what === 'name-group') {
      const numbers = element.getAttribute('data-number').split(',');
      P.setGroupName(numbers[0], numbers[1], element.value);
    } else {
      const encid = this.findReferencedEncoder(element);
      let storeVal;
      if (typeof element.selectedIndex !== 'undefined') {
        storeVal = element.selectedIndex;
      } else if (element.type == 'checkbox') {
        storeVal = element.checked ? 1 : 0;
      } else {
        storeVal = element.value;
      }
      DOM.all(`.watchparams *[data-watch=${what}]`, (el) => {
        let eid = this.findReferencedEncoder(el);
        if (eid === encid) {
          const val =
            typeof element.selectedIndex !== 'undefined'
              ? element.selectedIndex
              : element.value;
          if (typeof el.selectedIndex !== 'undefined') {
            el.selectedIndex = val;
          } else {
            el.value = val;
          }
        }
      });
      if (what == P.lower || what == P.upper) {
        if (useHighres(this.selection, encid)) {
          let lsbs = storeVal & 0xff;
          let msbs = (storeVal & 0xf00) >> 8;
          P.set(this.selection, encid, what, lsbs);
          if (what == P.lower) {
            P.set(this.selection, encid, P.lower_msb, msbs);
          } else {
            P.set(this.selection, encid, P.upper_msb, msbs);
          }
        } else {
          P.set(this.selection, encid, what, storeVal);
        }
      } else {
        P.set(this.selection, encid, what, storeVal);
      }
      if (
        encid === this.selection.encoder &&
        useHighres(this.selection, encid)
      ) {
        DOM.element('#oled').setAttribute('data-highres', 1);
      } else {
        DOM.element('#oled').removeAttribute('data-highres');
      }
      DOM.all('#ctrlcontainer .enc', (el) => {
        const eid = this.findReferencedEncoder(el);
        if (useHighres(this.selection, eid)) {
          el.setAttribute('data-highres', 1);
        } else {
          el.removeAttribute('data-highres');
        }
      });
      if (what === P.scale) {
        updateDisplayValues = true;
      }
      if (what === P.type) {
        if (
          P.get(this.selection, encid, P.number) > 31 &&
          P.get(this.selection, encid, P.type) == 4
        ) {
          P.set(this.selection, encid, P.number, 31);
          updateDisplayValues = true;
        }
        updateDisplayValues = true;
        if (encid === this.selection.encoder) {
          DOM.element('#oled').setAttribute('data-type', storeVal);
        }
        DOM.all('#ctrlcontainer .enc', (el) => {
          const eid = this.findReferencedEncoder(el);
          const type = P.get(this.selection, eid, P.type);
          el.setAttribute('data-type', type);
        });
      }
      if (what === P.pb_type) {
        if (encid === this.selection.encoder) {
          DOM.element('#oled').setAttribute('data-pb_type', storeVal);
        }
        DOM.all('#ctrlcontainer .enc', (el) => {
          const eid = this.findReferencedEncoder(el);
          const type = P.get(this.selection, eid, P.pb_type);
          el.setAttribute('data-pb_type', type);
        });
      }
    }
    return updateDisplayValues;
  }

  findReferencedEncoder(element) {
    let encoderId = DOM.ancestorAttribute(element, 'data-enc');
    if (encoderId) {
      return parseInt(encoderId);
    } else {
      return this.selection.encoder;
    }
  }
}

document.addEventListener('DOMContentLoaded', function () {
  let notenumberoptions = '';
  for (let i = 0; i < 128; i++) {
    notenumberoptions += `<option>${note2String(i)}</option>`;
  }
  DOM.all('select[data-notenumbers]').forEach((e) => {
    DOM.addHTML(e, 'beforeEnd', notenumberoptions);
  });
  const selection = new Selection((selection) => {
    // console.log(`>> Selection ${selection.setup}, ${selection.group}, ${selection.encoder}`);
    DOM.removeClass('#ctrlcontainer .enc', 'selected');
    DOM.addClass(`#ctrlcontainer #enc${selection.encoder}`, 'selected');
    updateDisplayValues();
  });
  const inputhandler = new InputHandler(selection);
  const sysex = new Sysex({ deviceId: 0x0b, maxFileSize: 229340 });
  let SYSEX_BACKUP_MODE = false;
  buildUI();
  let fillLabel = '';

  // read factory preset
  console.log('Reading preset: ', FACTORY_PRESET_PATH);
  const req = new XMLHttpRequest();
  req.open('GET', FACTORY_PRESET_PATH, true);
  req.responseType = 'arraybuffer';
  req.onload = function (oEvent) {
    const data = req.response;
    if (data) {
      try {
        console.log('Parsing preset: ', FACTORY_PRESET_PATH);
        loadSysexData(new Uint8Array(data), true);
        console.log('Successfully parsed preset.');
      } catch (e) {
        console.log('Error reading factory preset', e);
        initialiseValues();
      }
    } else {
      console.log('No preset data received!', FACTORY_PRESET_PATH);
    }
  };
  req.send();

  function updateDisplayValues() {
    DOM.removeClass('#browser li', 'selected');
    DOM.addClass(`#browser > li:nth-child(${selection.setup + 1})`, 'selected');
    DOM.addClass(
      `#browser > li:nth-child(${selection.setup + 1}) li:nth-child(${
        selection.group + 1
      })`,
      'selected'
    );

    DOM.all('.watchparams *[data-watch]', (el) => {
      const what = el.getAttribute('data-watch');
      const encoderId = inputhandler.findReferencedEncoder(el);
      let value = P.get(selection, encoderId, what);
      if (typeof value === 'undefined') {
        return;
      }
      // console.log(`${sel.setup}, ${sel.group}, ${encoderId}: ${what} = ${value}`);
      if (what == 'lower' || what == 'upper') {
        if (useHighres(selection, encoderId)) {
          if (what == 'lower') {
            value += P.get(selection, encoderId, P.lower_msb) << 8;
          } else {
            value += P.get(selection, encoderId, P.upper_msb) << 8;
          }
          if (value > 4094) {
            value = 16383;
          }
        } else {
          value = P.get(selection, encoderId, what) & 0x7f;
        }
      }
      if (el.type == 'checkbox') {
        el.checked = value != 0;
      }
      if (typeof el.selectedIndex !== 'undefined') {
        el.selectedIndex = value;
      } else {
        if (typeof el.value !== 'undefined') {
          el.value = value;
        }
      }
      // InputHandler.checkValue(el, what);
    });
    DOM.element('#oled').setAttribute(
      'data-type',
      P.get(selection, selection.encoder, P.type)
    );
    DOM.element('#oled').setAttribute(
      'data-pb_type',
      P.get(selection, selection.encoder, P.pb_type)
    );
    DOM.all('#ctrlcontainer .enc', (el) => {
      const eid = inputhandler.findReferencedEncoder(el);
      let type = P.get(selection, eid, P.type);
      el.setAttribute('data-type', type);
      type = P.get(selection, eid, P.pb_type);
      el.setAttribute('data-pb_type', type);
    });
    for (let i = 0; i < 16; i++) {
      const setupAddr = MEM.addrSetupNames + i * 4;
      const setupName = P.stringFromPosition(MEM.data, setupAddr).replace(
        REnotNameChars,
        ' '
      );
      DOM.element(`#s${i}`).value = setupName;
      for (let j = 0; j < 16; j++) {
        const groupAddr = MEM.addrGroupNames + i * 64 + j * 4;
        const groupName = P.stringFromPosition(MEM.data, groupAddr).replace(
          REnotNameChars,
          ' '
        );
        DOM.element(`#s${i}g${j}`).value = groupName;
      }
    }
  }

  updateDisplayValues();

  function selectEncoder(e) {
    let selectedId = -1;
    switch (e.type) {
      case 'focus':
      case 'click':
        // if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") {
        //   return;
        // }
        selectedId = inputhandler.findReferencedEncoder(e.target);
        break;
      case 'change':
        selectedId = e.target.selectedIndex;
        break;
    }
    // console.log(`selectedId ${selectedId}`);
    if (selectedId > -1) {
      selection.encoder = selectedId;
      DOM.all('#oled *[data-watch=select-encoder]', (el) => {
        el.selectedIndex = selectedId;
      });
    }
  }

  function actionHandler(e) {
    const action = e.currentTarget.getAttribute('data-action');
    // console.log(`Action ${action}`);
    if (action.indexOf('edit-') === 0) {
      const name = action.split('-')[1];
      DOM.element('#ctrlcontainer').setAttribute('data-mode', name);
      DOM.element('#oled').setAttribute('data-mode', name);
      let lastFocused = selection.lastFocused;
      const isNPRN = DOM.element('#oled').getAttribute('data-type') === 8;
      if (isNPRN && lastFocused.indexOf(P.number) == -1) {
        lastFocused = P.number;
      }
      const eled = DOM.element(`#oled *[data-watch=${name}]`);
      if (eled) {
        if (eled.tagName === 'INPUT') eled.select();
        eled.focus();
      }
      let copyalllabel = P.labels[name];
      if (isNPRN && name === P.number) {
        if (lastFocused === P.number) {
          copyalllabel = 'LSB';
        } else if (lastFocused === P.number_h) {
          copyalllabel = 'MSB';
        }
      }
      if (copyalllabel) {
        DOM.element('#toallenc span').innerText = copyalllabel;
        DOM.show('#toallenc');
      } else {
        DOM.hide('#toallenc');
      }
      let fillButtonLabel = name + 's';
      fillLabel = name;
      switch (name) {
        case P.channel:
          case P.pb_channel: 
          fillButtonLabel = 'Channels';
          fillLabel = 'channels';
          break;
        case P.number:
          fillButtonLabel = 'Numbers' + (isNPRN ? ' (LSB)' : '');
          fillLabel = 'command numbers' + (isNPRN ? ' (LSB)' : '');
          break;
      }
      DOM.element('#fillnumbers span').innerText = fillButtonLabel;
    }
    switch (action) {
      case 'select-setup':
      case 'select-group':
        let number = e.currentTarget.getAttribute('data-number');
        if (action === 'select-setup') {
          selection.setup = number;
          selection.group = 0;
        } else {
          selection.group = number;
        }
        break;
      case 'select-encoder':
        selectEncoder(e);
        break;
      case 'copy2all':
        const what = DOM.ancestorAttribute(e.target, 'data-mode');
        const type = DOM.ancestorAttribute(e.target, 'data-type');
        let target = what;
        if (type == 8) {
          target = selection.lastFocused || what;
        }
        const value = P.get(selection, selection.encoder, target);
        for (let i = 0; i < 16; i++) {
          const targetType = P.get(selection, i, 'type');
          let setValue = value;
          if (targetType === 4 /* CC14bit */ && target === 'number') {
            if (setValue < 32) {
              P.set(selection, i, target, setValue);
            }
          } else {
            P.set(selection, i, target, setValue);
          }
        }
        updateDisplayValues();
        break;
      case 'mode-turn':
        DOM.element('#contentcontainer').setAttribute('data-mode', 'modeturn');
        DOM.element('#editnothing').click();
        break;
      case 'mode-push':
        DOM.element('#contentcontainer').setAttribute('data-mode', 'modepush');
        DOM.element('#editnothing').click();
        break;
      case 'filltopbottom':
      case 'fillbottomtop':
        fillNumbers(action);
        break;
    }
    e.stopPropagation();
  }

  DOM.all('*[data-action]', (e) => {
    e.addEventListener('click', actionHandler);
  });

  function watchHandler(event) {
    const what =
      event.currentTarget.getAttribute('data-watch') ||
      event.target.getAttribute('data-watch');
    let encoderId = null;
    encoderId =
      inputhandler.findReferencedEncoder(event.target) || selection.encoder;
    // console.log(`Watch ${what} on encoder #${encoderId}`);
    switch (what) {
      case P.name:
      case 'name-setup':
      case 'name-group':
        return inputhandler.checkNameKey(event, event.target, what);
      case 'select-encoder':
        selectEncoder(event);
        return;
      case P.number:
      case P.number_h:
      case P.lower:
      case P.upper:
      case P.channel:
      case P.pb_channel:
      case P.pb_number:
      case P.pb_lower:
      case P.pb_upper:
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          const add = event.key === 'ArrowUp' ? 1 : -1;
          if (
            (what == 'lower' || what == 'upper') &&
            useHighres(selection, encoderId)
          ) {
            let v = parseInt(event.target.value) + add;
            if (v > 4094 && add == -1) {
              v = 4094;
            }
            if (v > 4094) {
              v = 16383;
            }
            event.target.value = v;
          } else {
            event.target.value = parseInt(event.target.value) + add;
          }
          InputHandler.checkValue(event.target, what);
          inputhandler.distributeValue(event.target, what);
          return;
        }
        break;
    }
    if (event.target.tagName === 'INPUT') {
      return inputhandler.checkNumberKey(event, event.target, what);
    }
  }

  DOM.all('*[data-watch]', (element) => {
    const what = element.getAttribute('data-watch');
    switch (element.tagName) {
      case 'SELECT':
        element.addEventListener('change', (ev) => {
          watchHandler(ev);
          if (inputhandler.distributeValue(ev.target, what)) {
            updateDisplayValues();
          }
        });
        element.addEventListener('focus', (ev) => {
          selection.lastFocused = what;
          selectEncoder(ev);
        });
        break;
      case 'INPUT':
        element.addEventListener('keydown', watchHandler);
        element.addEventListener('keyup', (ev) => {
          inputhandler.distributeValue(ev.target, what); // TODO watch me!
        });
        element.addEventListener('focus', (ev) => {
          selection.lastFocused = what;
          element.select();
          selectEncoder(ev);
        });
        break;
    }
    if (element.type == 'checkbox') {
      element.addEventListener('change', (ev) => {
        InputHandler.checkValue(element, what);
        inputhandler.distributeValue(element, what);
      });
    }
    element.addEventListener('blur', (ev) => {
      InputHandler.checkValue(element, what);
      inputhandler.distributeValue(element, what);
    });
  });

  function generateSysexData() {
    const deviceparts = sysex.hiloNibbles(sysex.deviceId);
    let dataout = [
      0xf0,
      0x00,
      0x00,
      0x00,
      0x41,
      deviceparts[0],
      deviceparts[1],
      0x42,
      0x20,
      0x13,
      0x43, // CMD_APP_ID_H
      0x20,
      0x12,
      0x44, // CMD_APP_ID_L
      0x20,
      0x14,
    ];
    const pages = MEM.data.length / 64;
    for (let page = 0; page < pages; page++) {
      const pos = page * 64;
      const addr = pos + MEMORY_OFFSET;
      dataout.push(0x49, ...sysex.hiloNibbles(addr >> 8));
      dataout.push(0x4a, ...sysex.hiloNibbles(addr & 0xff));
      let crc = 0;
      for (let i = 0; i < 64; i++) {
        dataout.push(0x4d, ...sysex.hiloNibbles(MEM.data[pos + i]));
        crc += MEM.data[pos + i];
      }
      crc = crc & 0xffff;
      dataout.push(0x4b, ...sysex.hiloNibbles((crc & 0xff00) >> 8)); // CRC high
      dataout.push(0x4c, ...sysex.hiloNibbles(crc & 0x00ff)); // CRC low
      dataout.push(...Sysex.PADDING);
    }
    dataout.push(0x4f); // download stop
    dataout.push(...deviceparts);
    dataout.push(0xf7);
    return new Uint8Array(dataout);
  }

  function parseSysex(sysexdata) {
    const result = new Uint8Array(MEMORY_SIZE);
    const version = sysex.parseSysexData(
      sysexdata,
      (chunk) => {},
      (addr, pagedata) => {
        result.set(pagedata, addr - MEMORY_OFFSET);
        // console.log(addr - MEMORY_OFFSET, pagedata);
      }
    );
    // TODO convert version < 2 data
    // beim import alter daten bitte eine konvertierung des encoder-modes vornehmen: alle werte + 3, da acc0...acc3 jetzt nicht mehr auf den werten 0...3 liegen sondern auf den werten 3...6, den defaultwert für upper bei den push buttons bitte auf 127 setzen
    if (version < 2) {
      for (let s = 0; s < 16; s++) {
        for (let g = 0; g < 16; g++) {
          for (let e = 0; e < 16; e++) {
            let addr =
              P._getMemAddr(P._dataFormat[P.mode], { setup: s, group: g }) + e;
            let converted = (((result[addr] & 0xc0) >> 6) + 3) << 4;
            result[addr] = (result[addr] & 0x3f) + converted;
            addr =
              P._getMemAddr(P._dataFormat[P.pb_upper], { setup: s, group: g }) +
              e;
            result[addr] = result[addr] + 0x7f;
          }
        }
      }
    }

    return result;
  }

  function loadSysexData(data, force) {
    if (force) {
      MEM.data.fill(0);
      parseSysex(data).map((v, i) => (MEM.data[i] = v));
      updateDisplayValues();
      isDirty = false;
    } else {
      showMerge(parseSysex(data)).then((v) => {
        updateDisplayValues();
      });
    }
  }

  function sysexHandler(data) {
    if (data.length > 100 /* arbitrary number */) {
      if (SYSEX_BACKUP_MODE) {
        const now = new Date();
        function twoDigits(v) {
          return v < 10 ? `0${v}` : String(v);
        }
        let filename = `EC4-backup-${now.getFullYear()}-${twoDigits(
          now.getMonth() + 1
        )}-${twoDigits(now.getDate())}-${twoDigits(now.getHours())}-${twoDigits(
          now.getMinutes()
        )}.syx`;
        download(data, filename, 'application/octet-stream');
        SYSEX_BACKUP_MODE = false;
        sendData();
      } else {
        try {
          loadSysexData(data);
        } catch (e) {
          MBox.show(
            SEC4.title_data_received,
            STR.apply(SEC4.$msg_invalid_data, e.message),
            { hideAfter: 10000, type: 'error' }
          );
        }
      }
    } else {
      console.log('Ignoring sysex data due to length', data);
    }
  }

  const midi = new MIDI(
    'Faderfox EC4',
    sysexHandler,
    (midiavailable, message) => {
      if (midiavailable) {
        MBox.show(SEC4.welcome_title, SEC4.welcome_text);
      } else {
        MBox.show(STR.midictrl.title_error, message, { type: 'error' });
      }
    }
  );

  function sendData() {
    MBox.show(SEC4.title_send, SEC4.msg_send, {
      buttonLabel: 'Send',
      confirmCallback: function () {
        MBox.hide();
        let data = generateSysexData();
        midi.sendSysex(data, 90 * 1000);
      },
    });
  }

  DOM.on('#btntransfer', 'click', function () {
    if (midi.hasOutput()) {
      SYSEX_BACKUP_MODE = true;
      MBox.show(SEC4.title_send, SEC4.warning_send, {
        buttonLabel: SEC4.continue_without_backup,
        confirmCallback: function () {
          SYSEX_BACKUP_MODE = false;
          MBox.hide();
          sendData();
        },
        cancelCallback: function () {
          SYSEX_BACKUP_MODE = false;
        },
      });
    } else {
      MBox.show(STR.midictrl.title_error, STR.midictrl.nooutputs, {
        type: 'error',
      });
    }
  });
  DOM.on('#btnreceive', 'click', function () {
    if (midi.hasInput()) {
      MBox.show(SEC4.title_receive, SEC4.msg_receive);
    } else {
      MBox.show(STR.midictrl.title_error, STR.midictrl.noinputs, {
        type: 'error',
      });
    }
  });

  DOM.on('#btnfilesave', 'click', function () {
    MBox.show(
      SEC4.title_save,
      SEC4.msg_save +
        '<br/><br/><div class="field"><label>Filename:</label><input name="filename" type="text" size="12" value="" placeholder="filename" /><b>.syx</b></div>',
      {
        buttonLabel: 'Save File',
        confirmCallback: function () {
          let filename = DOM.element('#mbox input[name=filename]').value;
          if (filename && filename !== '') {
            download(
              generateSysexData(),
              filename + '.syx',
              'application/octet-stream'
            );
          }
          MBox.hide();
        },
      }
    );
  });

  DOM.on('#btnfileload', 'click', function () {
    MBox.show(
      SEC4.title_load,
      SEC4.msg_load + '<br/><br/><input type="file" name="file" />',
      {
        attachHandlers: function (boxelement) {
          DOM.attachInside(
            boxelement,
            'input[type=file]',
            'change',
            function (evt) {
              sysex.readFile(evt.target, function (data) {
                if (data) {
                  MBox.hide();
                  loadSysexData(data);
                  // MBox.hide();
                  // MBox.show(SEC4.title_load, SEC4.msg_loaded, {
                  //   hideAfter: 5000
                  // });
                }
              });
            }
          );
        },
      }
    );
  });

  function fillNumbers(fillmode) {
    const what = DOM.ancestorAttribute(DOM.element('#fillnumbers'), 'data-mode');
    const fromTopLeft = (fillmode=='filltopbottom');
    const startValue = fromTopLeft?P.get(selection, 0, what):P.get(selection, 12, what);
    MBox.show(
      fromTopLeft?SEC4.title_fillnumbers:SEC4.title_fillnumbers_bottom,
      STR.apply(fromTopLeft?SEC4.$msg_fillnumbers:SEC4.$msg_fillnumbers_bottom, fillLabel, startValue),
      {
        buttonLabel: 'OK',
        confirmCallback: function () {
          if (fromTopLeft) {
            for (let i = 1; i < 16; i++) {
              let value = startValue + i;
              switch (what) {
                case P.number:
                  value = value & 0x7f;
                  if (P.get(selection, i, P.type) === 4 /*CC14bit*/) {
                    if (value < 32) {
                      P.set(selection, i, P.number, value);
                    }
                  } else {
                    P.set(selection, i, P.number, value);
                  }
                  break;
                case P.channel:
                  while (value > 16) {
                    value = value - 16;
                  }
                  P.set(selection, i, P.channel, value);
                  break;
                case P.pb_channel:
                  while (value > 16) {
                    value = value - 16;
                  }
                  P.set(selection, i, P.pb_channel, value);
                  break;
                case P.pb_number:
                  value = value & 0x7f;
                  if (P.get(selection, i, P.pb_type) === 1 || P.get(selection, i, P.pb_type) === 2) {
                    P.set(selection, i, P.pb_number, value);
                  }
                  break;
              }
            }
          } else {
            for (let r=3; r>=0; r--) {
              for (let i = 0; i<4; i++) {
                let encId = r*4 + i;
                let value = (startValue + (3-r)*4 + i)  & 0x7f;
                switch (what) {
                  case P.number:
                    if (P.get(selection, encId, P.type) === 4 /*CC14bit*/) {
                      if (value < 32) {
                        P.set(selection, encId, P.number, value);
                      }
                    } else {
                      P.set(selection, encId, P.number, value);
                    }
                    break;
                  case P.channel:
                    value = value & 0xf;
                    P.set(selection, encId, P.channel, value);
                    break;
                  case P.pb_channel:
                    value = value & 0xf;
                    P.set(selection, encId, P.pb_channel, value);
                    break;
                  case P.pb_number:
                    if (P.get(selection, encId, P.pb_type) === 1 || P.get(selection, encId, P.pb_type) === 2) {
                      P.set(selection, encId, P.pb_number, value);
                    }
                    break;
                }
              }
            }
          }
          updateDisplayValues();
          MBox.hide();
        },
      }
    );
  };

  function copyToClipboard(what) {
    if (what === 'group') {
      let addr =
        MEM.addrPresets +
        (selection.setup * 16 + selection.group) * MEM.lengthGroup;
      MEM.clipboardDataGroup = new Uint8Array(
        MEM.lengthGroup + MEM.lengthGroupKey1 + MEM.lengthGroupKey2
      );
      for (let i = 0; i < MEM.lengthGroup; i++) {
        MEM.clipboardDataGroup[i] = MEM.data[addr + i];
      }
      addr =
        MEM.addrKey1 +
        (selection.setup * 16 + selection.group) * MEM.lengthGroupKey1;
      for (let i = 0; i < MEM.lengthGroupKey1; i++) {
        MEM.clipboardDataGroup[i + MEM.lengthGroup] = MEM.data[addr + i];
      }
      addr =
        MEM.addrKey2 +
        (selection.setup * 16 + selection.group) * MEM.lengthGroupKey2;
      for (let i = 0; i < MEM.lengthGroupKey2; i++) {
        MEM.clipboardDataGroup[i + MEM.lengthGroup + MEM.lengthGroupKey1] =
          MEM.data[addr + i];
      }
      MBox.show(
        SEC4.title_copypaste,
        STR.apply(
          SEC4.$msg_copy_group,
          `${selection.group + 1} (&quot;${P.getGroupName(
            selection.setup,
            selection.group
          )}&quot;)`
        ),
        { hideAfter: 5000 }
      );
    } else {
      // whole setup
      let addr = MEM.addrPresets + selection.setup * MEM.lengthSetup;
      MEM.clipboardDataSetup.setupData = new Uint8Array(
        MEM.lengthSetup + MEM.lengthSetupKey1 + MEM.lengthSetupKey2
      );
      for (let i = 0; i < MEM.lengthSetup; i++) {
        MEM.clipboardDataSetup.setupData[i] = MEM.data[addr + i];
      }
      addr = MEM.addrKey1 + selection.setup * MEM.lengthSetupKey1;
      for (let i = 0; i < MEM.lengthSetupKey1; i++) {
        MEM.clipboardDataSetup.setupData[i + MEM.lengthSetup] =
          MEM.data[addr + i];
      }
      addr = MEM.addrKey2 + selection.setup * MEM.lengthSetupKey2;
      for (let i = 0; i < MEM.lengthSetupKey2; i++) {
        MEM.clipboardDataSetup.setupData[
          i + MEM.lengthSetup + MEM.lengthSetupKey1
        ] = MEM.data[addr + i];
      }
      const addrGNames = MEM.addrGroupNames + selection.setup * 64;
      MEM.clipboardDataSetup.groupNames = new Uint8Array(64);
      for (let i = 0; i < 64; i++) {
        MEM.clipboardDataSetup.groupNames[i] = MEM.data[addrGNames + i];
      }
      MBox.show(
        SEC4.title_copypaste,
        STR.apply(
          SEC4.$msg_copy_setup,
          `${selection.setup + 1} (&quot;${P.getSetupName(
            selection.setup
          )}&quot;)`
        ),
        { hideAfter: 5000 }
      );
    }
  }
  function pasteFromClipboard(what) {
    if (what === 'group') {
      if (!MEM.clipboardDataGroup) {
        MBox.show(SEC4.title_copypaste, SEC4.msg_clipboard_empty, {
          hideAfter: 5000,
        });
      } else {
        MBox.show(
          SEC4.title_copypaste,
          STR.apply(
            SEC4.$msg_paste_group,
            `${selection.group + 1} (&quot;${P.getGroupName(
              selection.setup,
              selection.group
            )}&quot;)`
          ),
          {
            confirmCallback: function () {
              let addr =
                MEM.addrPresets +
                (selection.setup * 16 + selection.group) * MEM.lengthGroup;
              for (var i = 0; i < MEM.lengthGroup; i++) {
                MEM.data[addr + i] = MEM.clipboardDataGroup[i];
              }
              addr =
                MEM.addrKey1 +
                (selection.setup * 16 + selection.group) * MEM.lengthGroupKey1;
              for (let i = 0; i < MEM.lengthGroupKey1; i++) {
                MEM.data[addr + i] =
                  MEM.clipboardDataGroup[i + MEM.lengthGroup];
              }
              addr =
                MEM.addrKey2 +
                (selection.setup * 16 + selection.group) * MEM.lengthGroupKey2;
              for (let i = 0; i < MEM.lengthGroupKey2; i++) {
                MEM.data[addr + i] =
                  MEM.clipboardDataGroup[
                    i + MEM.lengthGroup + MEM.lengthGroupKey1
                  ];
              }
              updateDisplayValues();
              MBox.hide();
              MBox.show(SEC4.title_copypaste, SEC4.msg_pasted, {
                hideAfter: 5000,
              });
            },
          }
        );
      }
    } else {
      if (
        !MEM.clipboardDataSetup.setupData ||
        !MEM.clipboardDataSetup.groupNames
      ) {
        MBox.show(SEC4.title_copypaste, SEC4.msg_clipboard_empty, {
          hideAfter: 5000,
        });
      } else {
        MBox.show(
          SEC4.title_copypaste,
          STR.apply(
            SEC4.$msg_paste_setup,
            `${selection.setup + 1} (&quot;${P.getSetupName(
              selection.setup
            )}&quot;)`
          ),
          {
            confirmCallback: function () {
              let addr = MEM.addrPresets + selection.setup * MEM.lengthSetup;
              for (let i = 0; i < MEM.lengthSetup; i++) {
                MEM.data[addr + i] = MEM.clipboardDataSetup.setupData[i];
              }
              addr = MEM.addrKey1 + selection.setup * MEM.lengthSetupKey1;
              for (let i = 0; i < MEM.lengthSetupKey1; i++) {
                MEM.data[addr + i] =
                  MEM.clipboardDataSetup.setupData[i + MEM.lengthSetup];
              }
              addr = MEM.addrKey2 + selection.setup * MEM.lengthSetupKey2;
              for (let i = 0; i < MEM.lengthSetupKey2; i++) {
                MEM.data[addr + i] =
                  MEM.clipboardDataSetup.setupData[
                    i + MEM.lengthSetup + MEM.lengthSetupKey1
                  ];
              }
              const addrGNames = MEM.addrGroupNames + selection.setup * 64;
              for (let i = 0; i < 64; i++) {
                MEM.data[addrGNames + i] = MEM.clipboardDataSetup.groupNames[i];
              }
              updateDisplayValues();
              MBox.hide();
              MBox.show(SEC4.title_copypaste, SEC4.msg_pasted, {
                hideAfter: 5000,
              });
            },
          }
        );
      }
    }
  }
  DOM.on('#btncopygroup', 'click', function () {
    copyToClipboard('group');
  });
  DOM.on('#btnpastegroup', 'click', function () {
    pasteFromClipboard('group');
  });
  DOM.on('#btncopysetup', 'click', function () {
    copyToClipboard('setup');
  });
  DOM.on('#btnpastesetup', 'click', function () {
    pasteFromClipboard('setup');
  });

  window.addEventListener('beforeunload', function (e) {
    if (isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  selection.setAll(0, 0, 0);
});

function buildUI() {
  function createNameInput(id, type, number, value) {
    let element = document.createElement('input');
    element.setAttribute('id', id);
    element.setAttribute('type', 'text');
    element.setAttribute('data-watch', 'name-' + type);
    element.setAttribute('data-number', number);
    element.setAttribute('maxlength', 4);
    element.setAttribute('value', value || '');
    return element;
  }
  let setupList = document.createElement('ul');
  setupList.setAttribute('id', 'browser');
  for (let setupNumber = 0; setupNumber < 16; setupNumber++) {
    let setupItem = document.createElement('li');
    setupItem.setAttribute('data-action', 'select-setup');
    setupItem.setAttribute('data-number', setupNumber);
    if (setupNumber === 0) {
      setupItem.classList.add('selected');
    }
    let groupList = document.createElement('ul');
    groupList.className = 'group';
    for (let groupNumber = 0; groupNumber < 16; groupNumber++) {
      let groupItem = document.createElement('li');
      groupItem.setAttribute('data-action', 'select-group');
      groupItem.setAttribute('data-number', groupNumber);
      if (groupNumber === 0) {
        groupItem.classList.add('selected');
      }
      groupItem.appendChild(
        createNameInput(
          `s${setupNumber}g${groupNumber}`,
          'group',
          `${setupNumber},${groupNumber}`,
          'GR' + (groupNumber < 9 ? '0' : '') + (groupNumber + 1)
        )
      );
      groupList.appendChild(groupItem);
    }
    setupItem.appendChild(
      createNameInput(
        `s${setupNumber}`,
        'setup',
        setupNumber,
        'SE' + (setupNumber < 9 ? '0' : '') + (setupNumber + 1)
      )
    );
    setupItem.appendChild(groupList);
    setupList.appendChild(setupItem);
  }
  DOM.element('#setupsandgroups').prepend(setupList);
  let notenumberoptions = '';
  for (let i = 0; i < 128; i++) {
    notenumberoptions += `<option>${note2String(i)}</option>`;
  }
  // build encoders
  for (let i = 0; i < 16; i++) {
    const twodig = (i < 9 ? '0' : '') + (i + 1);
    const html = `
            <section>
                <div id="enc${i}" data-action="select-encoder" data-enc="${i}" class="enc typed">
                    <div class="knob"></div>
                    <img src="tap-svgrepo-com.svg" width="24px" class="tapicon" title="Push button mode (click to toggle)" data-action="mode-turn"/>
                    <img src="rotate-svgrepo-com.svg" width="24px" class="rotateicon" title="Turn mode (click to toggle)" data-action="mode-push"/>
                    <div class="n"><input data-watch="name" id="enc_name${i}" class="matrixfont" type="text" maxlength="4" value="EC${twodig}" tabindex="${
      200 + i
    }" title="Edit name of encoder/button"/></div>
                    <div class="v">
                        <div class="number">
                            <div class="standard"><label>${
                              P.labels.number
                            }</label><input data-watch="number" maxlength="3" type="text" value="0" tabindex="${
      216 + i
    }"/></div>
                            <div class="hi-lo"><label>${
                              P.labels.number_nrpn
                            }</label>
                              <div class="inputs">
                                  <input data-watch="number_h" maxlength="3" type="text" value="0" tabindex="${
                                    216 + i
                                  }" />
                                  <input data-watch="number" maxlength="3" type="text" value="0" tabindex="${
                                    216 + i
                                  }" />
                              </div>
                            </div>
                            <div class="note">
                              <label>${P.labels.number_note}</label>
                              <div class="inputs">
                                <input data-watch="number" maxlength="3" type="text" value="0" tabindex="${
                                  216 + i
                                }"/>
                                <select data-watch="number" tabindex="${
                                  216 + i
                                }">
                                  ${notenumberoptions}
                                </select>
                              </div>
                            </div>
                        </div>
                        <div class="channel"><label>${
                          P.labels.channel
                        }</label><input data-watch="channel" maxlength="2" type="text" value="0" tabindex="${
      216 + i
    }" /></div>
                        <div class="lower"><label>${
                          P.labels.lower
                        }</label><input data-watch="lower" maxlength="4" type="text" value="0" tabindex="${
      216 + i
    }" /></div>
                        <div class="upper"><label>${
                          P.labels.upper
                        }</label><input data-watch="upper" maxlength="4" type="text" value="0" tabindex="${
      216 + i
    }" /></div>
                        <div class="scale"><label>${P.labels.scale}</label>
                            <select data-watch="scale" tabindex="${216 + i}">
                                <option>display off</option>
                                <option>0...127</option>
                                <option>0...100</option>
                                <option>0...1000</option>
                                <option>-63...+63</option>
                                <option>-50...+50</option>
                                <option>-500...+500</option>
                                <option>ON / OFF</option>
                                <option>0...9999</option>
                            </select>
                        </div>
                        <div class="type"><label>${P.labels.type}</label>
                            <select data-watch="type" tabindex="${216 + i}">
                                <option>CC rel. 1</option>
                                <option>CC rel. 2</option>
                                <option>CC absolute</option>
                                <option>Program change</option>
                                <option>CC 14bit absolute</option>
                                <option>Pitch bend</option>
                                <option>Aftertouch</option>
                                <option>Note</option>
                                <option>NRPN</option>
                            </select>
                        </div>
                        <div class="mode"><label>${P.labels.mode}</label>
                            <select data-watch="mode" tabindex="${216 + i}">
                              <option>div. by 8</option>
                              <option>div. by 4</option>
                              <option>div. by 2</option>
                              <option>no acceleration</option>
                              <option>low acceleration</option>
                              <option>middle acceleration</option>
                              <option>max acceleration</option>
                              <option>large step 2</option>
                              <option>large step 4</option>
                              <option>large step 6</option>
                            </select>
                        </div>
                        <div class="pb_channel"><label>${
                          P.labels.channel
                        }</label><input data-watch="pb_channel" maxlength="2" type="text" value="0" tabindex="${
      216 + i
    }" /></div>
                        <div class="pb_display"><label>${
                          P.labels.pb_display
                        }</label>
                            <select data-watch="pb_display" tabindex="${
                              216 + i
                            }">
                                <option>Off</option>
                                <option>On</option>
                            </select>
                        </div>
                        <div class="pb_number">
                            <div class="pb_standard">
                              <label>${P.labels.pb_number}</label>
                              <div class="inputs">
                                <input data-watch="pb_number" maxlength="3" type="text" value="0" tabindex="${
                                  216 + i
                                }"/>
                              </div>
                            </div>
                            <div class="pb_note">
                              <label>${P.labels.number_note}</label>
                              <div class="inputs">
                                <input data-watch="pb_number" maxlength="3" type="text" value="0" tabindex="${
                                  216 + i
                                }"/>
                                <select data-watch="pb_number" tabindex="${
                                  216 + i
                                }">
                                  ${notenumberoptions}
                                </select>
                              </div>
                            </div>
                        </div>
                        <div class="pb_type">
                          <label>${P.labels.pb_type}</label>
                          <select data-watch="pb_type" class="b">
                            <option>Off</option>
                            <option>Note</option>
                            <option>CC</option>
                            <option>PrgC</option>
                            <option>PBnd</option>
                            <option>AftT</option>
                            <option>Grp</option>
                            <option>Set</option>
                            <option>Acc0</option>
                            <option>Acc3</option>
                            <option>LSp6</option>
                            <option>Min</option>
                            <option>Max</option>
                          </select>
                        </div>
                        <div class="pb_mode">
                          <label>${P.labels.pb_mode}</label>
                          <select data-watch="pb_mode">
                            <option>Key</option>
                            <option>Togl</option>
                          </select>
                        </div>
                        <div class="pb_lower"><label>${
                          P.labels.pb_lower
                        }</label><input data-watch="pb_lower" maxlength="3" type="text" value="0" tabindex="${
      216 + i
    }" /></div>
                        <div class="pb_upper"><label>${
                          P.labels.pb_upper
                        }</label><input data-watch="pb_upper" maxlength="3" type="text" value="0" tabindex="${
      216 + i
    }" /></div>
                    </div>
                    <div class="link turn matrixfont" title="Link this encoder to next"><input type="checkbox" id="linkenc${i}" data-watch="link" data-action="edit-link"/><label for="linkenc${i}"><span>Link</span>&gt;</label></div>
                    <div class="link push matrixfont" title="Link this push button to next"><input type="checkbox" id="linkpb${i}" data-watch="pb_link" data-action="edit-pb_link"/><label for="linkpb${i}"><span>Link</span>&gt;</label></div>
                </div>
            </section>`;
    DOM.addHTML('#ctrlcontainer', 'beforeend', html);
  }
}

function memcpy(sourceData, addr, length) {
  for (let i = 0; i < length; i++) {
    MEM.data[addr + i] = sourceData[addr + i];
  }
}

function doMerge(sourceData, selectedElements) {
  selectedElements.forEach((element) => {
    const { group, setup } = element;
    if (group !== null) {
      const addr = MEM.addrPresets + (setup * 16 + group) * MEM.lengthGroup;
      memcpy(sourceData, addr, MEM.lengthGroup);
      const addr1 = MEM.addrKey1 + (setup * 16 + group) * MEM.lengthGroupKey1;
      memcpy(sourceData, addr1, MEM.lengthGroupKey1);
      const addr2 = MEM.addrKey2 + (setup * 16 + group) * MEM.lengthGroupKey2;
      memcpy(sourceData, addr2, MEM.lengthGroupKey2);
      const nameAddr = MEM.addrGroupNames + setup * 64 + group * 4;
      memcpy(sourceData, nameAddr, 4);
    } else {
      const nameAddr = MEM.addrSetupNames + setup * 4;
      memcpy(sourceData, nameAddr, 4);
    }
  });
}

function showMerge(data) {
  return new Promise((resolve, reject) => {
    MBox.hide();
    MBox.hideTemp();
    let html = `<div id="dim"></div><div id="merge"><div class="content"><p>${SEC4.merge_intro} <button data-import="select-all">${SEC4.merge_btn_select_all}</button><button data-import="select-none">${SEC4.merge_btn_select_none}</button></p></div><div class="mergecontainer">`;
    for (let s = 0; s < 16; s++) {
      const setupAddr = MEM.addrSetupNames + s * 4;
      const sname = P.stringFromPosition(data, setupAddr);
      html += `<div class="msetup"><span class="msetup" title="${
        SEC4.merge_tooltip_toggle_setup
      } ${s + 1}" data-selected="0" data-setup="${s}">${sname}:</span>`;
      for (let g = 0; g < 16; g++) {
        const groupAddr = MEM.addrGroupNames + s * 64 + g * 4;
        const gname = P.stringFromPosition(data, groupAddr);
        html += `<span class="mgroup" title="${
          SEC4.merge_tooltip_toggle_group
        } ${g + 1} in setup ${
          s + 1
        }" data-selected="0" data-setup="${s}" data-group="${g}">${gname}</span>`;
      }
      html += '</div>';
    }
    html += `</div>
      <div class="content">
        <button class="default" data-import="selected">${SEC4.merge_btn_import}</button>
        <button data-import="cancel">Cancel</button>
      </div>
    </div>`;
    DOM.addHTML('body', 'beforeend', html);
    DOM.on('.mergecontainer span[data-selected]', 'click', (e) => {
      const el = e.target;
      let wholeSetup = !el.getAttribute('data-group');
      let selected = Math.abs(el.getAttribute('data-selected') - 1);
      el.setAttribute('data-selected', selected);
      if (wholeSetup) {
        DOM.all(
          `.mergecontainer span[data-setup="${el.getAttribute('data-setup')}"]`,
          (e) => {
            e.setAttribute('data-selected', selected);
          }
        );
      }
    });
    function closeMergeDialog() {
      DOM.element('#merge').remove();
      DOM.element('#dim').remove();
    }
    DOM.on('#merge button', 'click', (e) => {
      const action = e.target.getAttribute('data-import');
      switch (action) {
        case 'selected':
          let selectedElements = [];
          DOM.all('.mergecontainer span[data-selected="1"]', (e) => {
            selectedElements.push({
              setup: parseInt(e.getAttribute('data-setup')),
              group: e.getAttribute('data-group')
                ? parseInt(e.getAttribute('data-group'))
                : null,
            });
          });
          if (selectedElements.length == 0) {
            MBox.show('Import', SEC4.merge_no_selection, { hideAfter: 5000 });
          } else {
            doMerge(data, selectedElements);
            closeMergeDialog();
            resolve();
          }
          break;
        case 'select-all':
          DOM.all('.mergecontainer span[data-selected]', (e) => {
            e.setAttribute('data-selected', 1);
          });
          break;
        case 'select-none':
          DOM.all('.mergecontainer span[data-selected]', (e) => {
            e.setAttribute('data-selected', 0);
          });
          break;
        case 'cancel':
          closeMergeDialog();
          resolve();
          break;
      }
    });
  });
}

const notenames = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

function note2String(n) {
  let name = notenames[n % 12];
  let octave = parseInt(n / 12) - 2;
  return name + octave;
}

function useHighres(selection, encid) {
  const enc_type = P.get(selection, encid, P.type);
  const enc_disp = P.get(selection, encid, P.scale);
  return (
    (enc_type == 4 || enc_type == 5 || enc_type == 8) &&
    (enc_disp == 0 || enc_disp == 3 || enc_disp == 6 || enc_disp == 8)
  );
}
