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

const MEM = {
  data: new Uint8Array(50240),
  lengthGroup: 192,
  lengthSetup: 192 * 16,
  dataOffset: 0x1bc0,
  addrSetupNames: 0,
  addrGroupNames: 0x1c00 - 0x1bc0,
  addrPresets: 0x2000 - 0x1bc0,
  clipboardDataGroup: null,
  clipboardDataSetup: {
    groupNames: undefined,
    setupData: undefined
  }
};

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
  mode: 'mode',
  scale: 'scale',
  name: 'name',

  labels: {
    type: 'Type',
    channel: 'Channel',
    number: 'Number',
    number_h: 'MSB',
    number_nrpn: '#MSB/LSB',
    lower: 'Lower',
    upper: 'Upper',
    mode: 'Mode',
    scale: 'Display'
  },

  _dataFormat: {
    type: { pos: 0, mask: 0xf0, lsb: 4, min: 0, max: 8, default: 2 },
    channel: { pos: 0, mask: 0x0f },
    number: { pos: 16, mask: 0xff },
    number_h: { pos: 32, mask: 0xff },
    lower: { pos: 48, mask: 0xff },
    upper: { pos: 64, mask: 0xff },
    mode: {
      pos: 80,
      mask: parseInt('11000000', 2),
      lsb: 6,
      min: 0,
      max: 3,
      default: 3
    },
    scale: {
      pos: 80,
      mask: parseInt('00111111', 2),
      min: 0,
      max: 7,
      default: 1
    },
    name: { pos: 128 }
  },

  get: function(selection, encoder, type) {
    const setup = selection.setup;
    const group = selection.group;
    if (type === 'select-encoder') {
      return;
    }
    const spec = P._dataFormat[type];
    if (!spec) {
      console.log('Get unknown parameter type: ' + type);
      return;
    }
    let addr =
      MEM.addrPresets + (setup * 16 + group) * MEM.lengthGroup + spec.pos;
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
        if (type === P.channel) val++;
        return val;
      } else {
        return MEM.data[addr];
      }
    }
  },
  set: function(selection, encoder, type, value) {
    const setup = selection.setup;
    const group = selection.group;
    const spec = P._dataFormat[type];
    if (!spec) {
      console.log('Set unknown parameter type: ' + type);
      return;
    }
    let addr =
      MEM.addrPresets + (setup * 16 + group) * MEM.lengthGroup + spec.pos;
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
      if (type === P.channel) value--;
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
  setSetupName: function(setupNumber, name) {
    while (name.length < 4) {
      name += ' ';
    }
    const addr = MEM.addrSetupNames + setupNumber * 4;
    for (let i = 0; i < 4; i++) {
      MEM.data[addr + i] = name.charCodeAt(i);
    }
  },
  setGroupName: function(setupNumber, groupNumber, name) {
    while (name.length < 4) {
      name += ' ';
    }
    const addr = MEM.addrGroupNames + setupNumber * 64 + groupNumber * 4;
    for (let i = 0; i < 4; i++) {
      MEM.data[addr + i] = name.charCodeAt(i);
    }
  },
  getGroupName: function(setupNumber, groupNumber) {
    return P.stringFromPosition(
      MEM.data,
      MEM.addrGroupNames + setupNumber * 64 + groupNumber * 4
    );
  },
  getSetupName: function(setupNumber) {
    return P.stringFromPosition(MEM.data, MEM.addrSetupNames + setupNumber * 4);
  },
  stringFromPosition: function(data, position) {
    const characters = data.subarray(position, position + 4);
    return String.fromCharCode(...characters);
  }
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

  checkValue(element, what) {
    let value = element.value;
    switch (what) {
      case P.channel:
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
      case P.number_h:
      case P.lower:
      case P.upper:
        if (value < 0) value = 0;
        else if (value > 127) value = 127;
        break;
    }
    element.value = value;
  }

  distributeValue(element, what) {
    let reloadValues = false;
    if (what === 'name-setup') {
      const setupNumber = element.getAttribute('data-number');
      P.setSetupName(setupNumber, element.value);
    } else if (what === 'name-group') {
      const numbers = element.getAttribute('data-number').split(',');
      P.setGroupName(numbers[0], numbers[1], element.value);
    } else {
      const encid = this.findReferencedEncoder(element);
      DOM.all(`.watchparams *[data-watch=${what}]`, el => {
        let eid = this.findReferencedEncoder(el);
        if (eid === encid) {
          el.value = element.value;
          if (typeof element.selectedIndex !== 'undefined') {
            el.selectedIndex = element.selectedIndex;
          }
        }
      });
      let storeVal =
        typeof element.selectedIndex !== 'undefined'
          ? element.selectedIndex
          : element.value;
      P.set(this.selection, encid, what, storeVal);
      if (what === P.type) {
        if (P.get(this.selection, encid, P.number) > 31) {
          P.set(this.selection, encid, P.number, 31);
          reloadValues = true;
        }
        if (encid === this.selection.encoder) {
          DOM.element('#oled').setAttribute('data-type', storeVal);
        }
        DOM.all('#ctrlcontainer .enc', el => {
          const eid = this.findReferencedEncoder(el);
          const type = P.get(this.selection, eid, P.type);
          el.setAttribute('data-type', type);
        });
      }
    }
    return reloadValues;
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

document.addEventListener('DOMContentLoaded', function() {
  const selection = new Selection(selection => {
    // console.log(`>> Selection ${selection.setup}, ${selection.group}, ${selection.encoder}`);
    DOM.removeClass('#ctrlcontainer .enc', 'selected');
    DOM.addClass(`#ctrlcontainer #enc${selection.encoder}`, 'selected');
    syncValues();
  });
  const inputhandler = new InputHandler(selection);
  const sysex = new Sysex({ deviceId: 0x0b, maxFileSize: 183710 });
  let SYSEX_BACKUP_MODE = false;
  buildUI();
  let fillLabel = '';

  // read factory preset
  const req = new XMLHttpRequest();
  req.open('GET', 'factory-preset.syx', true);
  req.responseType = 'arraybuffer';
  req.onload = function(oEvent) {
    const data = req.response;
    if (data) {
      try {
        loadSysexData(new Uint8Array(data), true);
      } catch (e) {
        console.log('Error reading factory preset', e);
        initialiseValues();
      }
    }
  };
  req.send();

  function syncValues() {
    DOM.removeClass('#browser li', 'selected');
    DOM.addClass(`#browser > li:nth-child(${selection.setup + 1})`, 'selected');
    DOM.addClass(
      `#browser > li:nth-child(${selection.setup +
        1}) li:nth-child(${selection.group + 1})`,
      'selected'
    );

    DOM.all('.watchparams *[data-watch]', el => {
      const what = el.getAttribute('data-watch');
      const encoderId = inputhandler.findReferencedEncoder(el);
      const value = P.get(selection, encoderId, what);
      if (typeof value === 'undefined') {
        return;
      }
      // console.log(`${sel.setup}, ${sel.group}, ${encoderId}: ${what} = ${value}`);
      if (typeof el.selectedIndex !== 'undefined') {
        el.selectedIndex = value;
      } else {
        if (typeof el.value !== 'undefined') {
          el.value = value;
        }
      }
    });
    DOM.element('#oled').setAttribute(
      'data-type',
      P.get(selection, selection.encoder, P.type)
    );
    DOM.all('#ctrlcontainer .enc', el => {
      const eid = inputhandler.findReferencedEncoder(el);
      const type = P.get(selection, eid, P.type);
      el.setAttribute('data-type', type);
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

  syncValues();

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
      DOM.element(
        '#oled *[data-watch=select-encoder]'
      ).selectedIndex = selectedId;
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
        syncValues();
        break;
    }
    e.stopPropagation();
  }

  DOM.all('*[data-action]', e => {
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
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          const add = event.key === 'ArrowUp' ? 1 : -1;
          event.target.value = parseInt(event.target.value) + add;
          inputhandler.checkValue(event.target, what);
          inputhandler.distributeValue(event.target, what);
          return;
        }
        break;
    }
    if (event.target.tagName === 'INPUT') {
      return inputhandler.checkNumberKey(event, event.target, what);
    }
  }

  DOM.all('*[data-watch]', element => {
    const what = element.getAttribute('data-watch');
    switch (element.tagName) {
      case 'SELECT':
        element.addEventListener('change', ev => {
          watchHandler(ev);
          if (inputhandler.distributeValue(ev.target, what)) {
            syncValues();
          }
        });
        element.addEventListener('focus', ev => {
          selection.lastFocused = what;
          selectEncoder(ev);
        });
        break;
      case 'INPUT':
        element.addEventListener('keydown', watchHandler);
        element.addEventListener('keyup', () => {
          inputhandler.distributeValue(event.target, what);
        });
        element.addEventListener('focus', ev => {
          selection.lastFocused = what;
          element.select();
          selectEncoder(ev);
        });
        break;
    }
    element.addEventListener('blur', ev => {
      inputhandler.checkValue(element, what);
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
      0x43,
      0x20,
      0x10,
      0x44,
      0x20,
      0x14
    ];
    const pages = MEM.data.length / 64;
    for (let page = 0; page < pages; page++) {
      const pos = page * 64;
      const addr = pos + MEM.dataOffset;
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
    const result = new Uint8Array(50240);
    sysex.parseSysexData(
      sysexdata,
      chunk => {},
      (addr, pagedata) => {
        result.set(pagedata, addr - MEM.dataOffset);
      }
    );
    return result;
  }

  function loadSysexData(data, force) {
    if (force) {
      MEM.data.fill(0);
      parseSysex(data).map((v, i) => (MEM.data[i] = v));
      syncValues();
      isDirty = false;
    } else {
      showMerge(parseSysex(data)).then(v => {
        syncValues();
      });
    }
  }

  function sysexHandler(data) {
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
        // MBox.show(SEC4.title_data_received, SEC4.msg_apply, {
        //   confirmCallback: function() {
        //     MBox.hide();
        //     loadSysexData(data);
        //     MBox.show(SEC4.title_data_received, SEC4.msg_data_applied, {
        //       hideAfter: 5000
        //     });
        //   }
        // });
      } catch (e) {
        MBox.show(
          SEC4.title_data_received,
          STR.apply(SEC4.$msg_invalid_data, e.message),
          { hideAfter: 10000, type: 'error' }
        );
      }
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
      confirmCallback: function() {
        MBox.hide();
        let data = generateSysexData();
        midi.sendSysex(data, 50000);
      }
    });
  }

  DOM.on('#btntransfer', 'click', function() {
    if (midi.hasOutput()) {
      SYSEX_BACKUP_MODE = true;
      MBox.show(SEC4.title_send, SEC4.warning_send, {
        buttonLabel: SEC4.continue_without_backup,
        confirmCallback: function() {
          SYSEX_BACKUP_MODE = false;
          MBox.hide();
          sendData();
        },
        cancelCallback: function() {
          SYSEX_BACKUP_MODE = false;
        }
      });
    } else {
      MBox.show(STR.midictrl.title_error, STR.midictrl.nooutputs, {
        type: 'error'
      });
    }
  });
  DOM.on('#btnreceive', 'click', function() {
    if (midi.hasInput()) {
      MBox.show(SEC4.title_receive, SEC4.msg_receive);
    } else {
      MBox.show(STR.midictrl.title_error, STR.midictrl.noinputs, {
        type: 'error'
      });
    }
  });

  DOM.on('#btnfilesave', 'click', function() {
    MBox.show(
      SEC4.title_save,
      SEC4.msg_save +
        '<br/><br/><div class="field"><label>Filename:</label><input name="filename" type="text" size="12" value="" placeholder="filename" /><b>.syx</b></div>',
      {
        buttonLabel: 'Save File',
        confirmCallback: function() {
          let filename = DOM.element('#mbox input[name=filename]').value;
          if (filename && filename !== '') {
            download(
              generateSysexData(),
              filename + '.syx',
              'application/octet-stream'
            );
          }
          MBox.hide();
        }
      }
    );
  });

  DOM.on('#btnfileload', 'click', function() {
    MBox.show(
      SEC4.title_load,
      SEC4.msg_load + '<br/><br/><input type="file" name="file" />',
      {
        attachHandlers: function(boxelement) {
          DOM.attachInside(boxelement, 'input[type=file]', 'change', function(
            evt
          ) {
            sysex.readFile(evt.target, function(data) {
              if (data) {
                MBox.hide();
                loadSysexData(data);
                // MBox.hide();
                // MBox.show(SEC4.title_load, SEC4.msg_loaded, {
                //   hideAfter: 5000
                // });
              }
            });
          });
        }
      }
    );
  });

  DOM.on('#fillnumbers', 'click', function(e) {
    const what = DOM.ancestorAttribute(e.target, 'data-mode');
    const startValue = P.get(selection, 0, what);
    MBox.show(
      SEC4.title_fillnumbers,
      STR.apply(SEC4.$msg_fillnumbers, fillLabel, startValue),
      {
        buttonLabel: 'Fill numbers',
        confirmCallback: function() {
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
            }
          }
          syncValues();
          MBox.hide();
        }
      }
    );
  });

  function copyToClipboard(what) {
    if (what === 'group') {
      const addr =
        MEM.addrPresets +
        (selection.setup * 16 + selection.group) * MEM.lengthGroup;
      MEM.clipboardDataGroup = new Uint8Array(MEM.lengthGroup);
      for (let i = 0; i < MEM.lengthGroup; i++) {
        MEM.clipboardDataGroup[i] = MEM.data[addr + i];
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
      const addr = MEM.addrPresets + selection.setup * MEM.lengthSetup;
      MEM.clipboardDataSetup.setupData = new Uint8Array(MEM.lengthSetup);
      for (let i = 0; i < MEM.lengthSetup; i++) {
        MEM.clipboardDataSetup.setupData[i] = MEM.data[addr + i];
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
          hideAfter: 5000
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
            confirmCallback: function() {
              const addr =
                MEM.addrPresets +
                (selection.setup * 16 + selection.group) * MEM.lengthGroup;
              for (var i = 0; i < MEM.lengthGroup; i++) {
                MEM.data[addr + i] = MEM.clipboardDataGroup[i];
              }
              syncValues();
              MBox.hide();
              MBox.show(SEC4.title_copypaste, SEC4.msg_pasted, {
                hideAfter: 5000
              });
            }
          }
        );
      }
    } else {
      if (
        !MEM.clipboardDataSetup.setupData ||
        !MEM.clipboardDataSetup.groupNames
      ) {
        MBox.show(SEC4.title_copypaste, SEC4.msg_clipboard_empty, {
          hideAfter: 5000
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
            confirmCallback: function() {
              const addr = MEM.addrPresets + selection.setup * MEM.lengthSetup;
              for (let i = 0; i < MEM.lengthSetup; i++) {
                MEM.data[addr + i] = MEM.clipboardDataSetup.setupData[i];
              }
              const addrGNames = MEM.addrGroupNames + selection.setup * 64;
              for (let i = 0; i < 64; i++) {
                MEM.data[addrGNames + i] = MEM.clipboardDataSetup.groupNames[i];
              }
              syncValues();
              MBox.hide();
              MBox.show(SEC4.title_copypaste, SEC4.msg_pasted, {
                hideAfter: 5000
              });
            }
          }
        );
      }
    }
  }
  DOM.on('#btncopygroup', 'click', function() {
    copyToClipboard('group');
  });
  DOM.on('#btnpastegroup', 'click', function() {
    pasteFromClipboard('group');
  });
  DOM.on('#btncopysetup', 'click', function() {
    copyToClipboard('setup');
  });
  DOM.on('#btnpastesetup', 'click', function() {
    pasteFromClipboard('setup');
  });

  window.addEventListener('beforeunload', function(e) {
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

  // build encoders
  for (let i = 0; i < 16; i++) {
    const twodig = (i < 9 ? '0' : '') + (i + 1);
    const html = `
            <section>
                <div id="enc${i}" data-action="select-encoder" data-enc="${i}" class="enc typed">
                    <div class="knob"></div>
                    <div class="n"><input data-watch="name" id="enc_name${i}" class="matrixfont" type="text" maxlength="4" value="EC${twodig}" tabindex="${200 +
      i}" title="Edit name of encoder"/></div>
                    <div class="v">
                        <div class="number">
                            <div class="standard"><label>${
                              P.labels.number
                            }</label><input data-watch="number" maxlength="3" type="text" value="0" tabindex="${216 +
      i}"/></div>
                            <div class="hi-lo"><label>${
                              P.labels.number_nrpn
                            }</label>
                                <input data-watch="number_h" maxlength="3" type="text" value="0" tabindex="${216 +
                                  i}" />
                                <input data-watch="number" maxlength="3" type="text" value="0" tabindex="${216 +
                                  i}" />
                            </div>
                        </div>
                        <div class="channel"><label>${
                          P.labels.channel
                        }</label><input data-watch="channel" maxlength="2" type="text" value="0" tabindex="${216 +
      i}" /></div>
                        <div class="lower"><label>${
                          P.labels.lower
                        }</label><input data-watch="lower" maxlength="3" type="text" value="0" tabindex="${216 +
      i}" /></div>
                        <div class="upper"><label>${
                          P.labels.upper
                        }</label><input data-watch="upper" maxlength="3" type="text" value="0" tabindex="${216 +
      i}" /></div>
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
                                <option>no acceleration</option>
                                <option>low acceleration</option>
                                <option>mid acceleration</option>
                                <option>max acceleration</option>
                            </select>
                        </div>
                    </div>
                </div>
            </section>`;
    DOM.addHTML('#ctrlcontainer', 'beforeend', html);
  }
}

function doMerge(sourceData, selectedElements) {
  selectedElements.forEach(element => {
    const { group, setup } = element;
    if (group !== null) {
      const addr = MEM.addrPresets + (setup * 16 + group) * MEM.lengthGroup;
      for (let i = 0; i < MEM.lengthGroup; i++) {
        MEM.data[addr + i] = sourceData[addr + i];
      }
      const nameAddr = MEM.addrGroupNames + setup * 64 + group * 4;
      for (let i = 0; i < 4; i++) {
        MEM.data[nameAddr + i] = sourceData[nameAddr + i];
      }
    } else {
      const nameAddr = MEM.addrSetupNames + setup * 4;
      for (let i = 0; i < 4; i++) {
        MEM.data[nameAddr + i] = sourceData[nameAddr + i];
      }
    }
  });
}

function showMerge(data) {
  return new Promise((resolve, reject) => {
    let html = `<div id="dim"></div><div id="merge"><div class="content"><p>${SEC4.merge_intro}</p></div><div class="mergecontainer">`;
    for (let s = 0; s < 16; s++) {
      const setupAddr = MEM.addrSetupNames + s * 4;
      const sname = P.stringFromPosition(data, setupAddr);
      html += `<div class="msetup"><span class="msetup" title="${SEC4.merge_tooltip_toggle_setup} ${s+1}" data-selected="0" data-setup="${s}">${sname}:</span>`;
      for (let g = 0; g < 16; g++) {
        const groupAddr = MEM.addrGroupNames + s * 64 + g * 4;
        const gname = P.stringFromPosition(data, groupAddr);
        html += `<span class="mgroup" title="${SEC4.merge_tooltip_toggle_group} ${g+1} in setup ${s+1}" data-selected="0" data-setup="${s}" data-group="${g}">${gname}</span>`;
      }
      html += '</div>';
    }
    html += `</div>
      <div class="content">
        <button class="default" data-import="selected">${SEC4.merge_btn_import}</button>
        <button data-import="all">${SEC4.merge_btn_import_all}</button>
        <button data-import="cancel">Cancel</button>
      </div>
    </div>`;
    DOM.addHTML('body', 'beforeend', html);
    DOM.on('.mergecontainer span[data-selected]', 'click', e => {
      const el = e.target;
      let wholeSetup = !el.getAttribute('data-group');
      let selected = Math.abs(el.getAttribute('data-selected') - 1);
      el.setAttribute('data-selected', selected);
      if (wholeSetup) {
        DOM.all(
          `.mergecontainer span[data-setup="${el.getAttribute('data-setup')}"]`,
          e => {
            e.setAttribute('data-selected', selected);
          }
        );
      }
    });
    function closeMergeDialog() {
      DOM.element('#merge').remove();
      DOM.element('#dim').remove();
    }
    DOM.on('#merge button', 'click', e => {
      const action = e.target.getAttribute('data-import');
      switch (action) {
        case 'selected':
          let selectedElements = [];
          DOM.all('.mergecontainer span[data-selected="1"]', e => {
            selectedElements.push({
              setup: parseInt(e.getAttribute('data-setup')),
              group: e.getAttribute('data-group')
                ? parseInt(e.getAttribute('data-group'))
                : null
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
        case 'all':
          MEM.data.fill(0);
          data.map((v, i) => (MEM.data[i] = v));
          closeMergeDialog();
          resolve();
          break;
        case 'cancel':
          closeMergeDialog();
          resolve();
          break;
      }
    });
  });
}
