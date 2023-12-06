/*
MIT License

Copyright (c) 2017 Peter Witzel, faderfox-editor

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

/**
 * DOM utilities
 */
let DOM = {
  /**
   * Returns first matching element for selector string or selector itself if it's no string.
   * @param {*} selector
   */
  element: function(selector) {
    if (typeof selector === 'string') {
      return document.querySelector(selector);
    } else {
      return selector;
    }
  },
  /**
   * Find elements within rootElement. Applies optional handler function for each element.
   * @param {object} rootElement
   * @param {string} selector
   * @param {function} handler
   */
  find: function(rootElement, selector, handler) {
    const list = rootElement.querySelectorAll(selector);
    if (handler) {
      for (let i = 0; i < list.length; i++) {
        handler(list[i]);
      }
    }
    return list;
  },
  /**
   * Returns list of all elements matching selector. Applies optional handler function for each element.
   * @param {*} selector
   * @param {function} handler
   */
  all: function(selector, handler) {
    let list = [];
    if (selector) {
      if (typeof selector === 'string') {
        list = document.querySelectorAll(selector);
      } else if (selector.tagName) {
        list = [selector];
      } else {
        list = selector.length ? Array.from(selector) : [selector];
      }
    }
    if (handler) {
      for (let i = 0; i < list.length; i++) {
        handler(list[i]);
      }
    }
    return list;
  },
  /**
   * Attaches event listener function to all elements matching selector.
   * @param {*} selector
   * @param {string} eventName
   * @param {function} handler
   */
  on: function(selector, eventName, handler) {
    DOM.all(selector, function(el) {
      el.addEventListener(eventName, handler);
    });
  },
  /**
   * Attaches event listener function to all elements matching selector only within rootElement.
   * @param {object} rootElement
   * @param {string} selector
   * @param {string} eventName
   * @param {function} handler
   */
  attachInside: function(rootElement, selector, eventName, handler) {
    DOM.find(rootElement, selector, function(el) {
      DOM.on(el, eventName, handler);
    });
  },
  /**
   * Clears content of all elements matching selector.
   * @param {*} selector
   */
  empty: function(selector) {
    DOM.all(selector, function(el) {
      while (el.firstChild) {
        el.removeChild(el.firstChild);
      }
    });
  },
  /**
   * Sets style.display = 'none' for all matching elements.
   * @param {*} selector
   */
  hide: function(selector) {
    DOM.all(selector, function(el) {
      el.style.display = 'none';
    });
  },
  /**
   * Sets style.display = 'block' for all matching elements.
   * @param {*} selector
   */
  show: function(selector) {
    DOM.all(selector, function(el) {
      el.style.display = 'block';
    });
  },
  /**
   * Removes style class 'visible' from all matching elements.
   * @param {*} selector
   */
  unvisible: function(selector) {
    DOM.removeClass(selector, 'visible');
  },
  /**
   * Adds style class 'visible' to all matching elements.
   * @param {*} selector
   */
  visible: function(selector) {
    DOM.addClass(selector, 'visible');
  },
  /**
   * Adds style class to all matching elements.
   * @param {*} selector
   * @param {string} className
   */
  addClass: function(selector, className) {
    DOM.all(selector, function(el) {
      el.classList.add(className);
    });
  },
  /**
   * Removes style class from all matching elements.
   * @param {*} selector
   * @param {string} className
   */
  removeClass: function(selector, className) {
    if (className) {
      DOM.all(selector, function(el) {
        el.classList.remove(className);
      });
    } else {
      DOM.all(selector, function(el) {
        el.className = '';
      });
    }
  },
  /**
   * Adds HTML to matching element at given position.
   * @param {*} selector
   * @param {string} position ['beforebegin', 'afterbegin', 'beforeend', 'afterend']
   * @param {string} html
   */
  addHTML: function(selector, position, html) {
    let element = DOM.element(selector);
    element.insertAdjacentHTML(position, html);
    return element;
  },
  /**
   * Returns attribute value of first element in parent chain containing this attribute.
   * @param {object} el
   * @param {string} attrname
   */
  ancestorAttribute: function(el, attrname) {
    let element = el;
    let attrValue = null;
    while (element && !(attrValue = element.getAttribute(attrname))) {
      element = element.parentElement;
    }
    return attrValue;
  }
};

/**
 * Message box/dialog handler
 */
function _MBox() {
  const self = this;
  self.initialized = false;
  document.addEventListener('DOMContentLoaded', function() {
    // create message box html
    DOM.addHTML(
      'body',
      'beforeend',
      '<div id="mbox" class="msgbox"><button class="x close">Close</button><h2></h2><div class="msg"></div><div class="buttons"><button class="ok">OK</button><button class="x">Cancel</button></div></div>'
    );
    self._element = DOM.element('#mbox');
    DOM.on('#mbox button.x', 'click', function(el) {
      self.hide();
      if (self.cancelCallback) self.cancelCallback();
    });
    DOM.on('#mbox', 'click', function(ev) {
      ev.stopPropagation();
    });
    DOM.addHTML(
      'body',
      'beforeend',
      '<div id="mboxtemp" class="msgbox"><button class="x close">Close</button><h2></h2><div class="msg"></div></div>'
    );
    self._elementTemp = DOM.element('#mboxtemp');
    DOM.on('#mboxtemp button.x', 'click', function() {
      self.hideTemp();
      if (self.cancelCallback) self.cancelCallback();
    });
    DOM.on('#mboxtemp', 'click', function(ev) {
      ev.stopPropagation();
    });
    self.initialized = true;
  });
}

/**
 * Shows a modal message box with title, message text (can containt HTML) and properties.
 * Properties: {
 *   type: [ '', error', 'processing' ],
 *   buttonLabel,
 *   hideAfter (ms),
 *   confirmCallback (function called after confirmation),
 *   cancelCallback (function called after cancel/close)
 *   attachHandlers (function called after initialisation with box-object to attach various handlers on input fields eg. for  validation, etc.)
 * }
 * @param {string} title
 * @param {string} msg
 * @param {object} props
 */
_MBox.prototype.show = function(title, msg, props) {
  if (this.initialized) {
    this.hideTemp();
    props = props || {};
    props.istemporary = typeof props.hideAfter !== 'undefined';

    let box = props.istemporary ? this._elementTemp : this._element;
    DOM.removeClass(box);
    DOM.addClass(box, 'msgbox');
    if (props.type) {
      DOM.addClass(box, props.type);
    }
    this.cancelCallback = props.cancelCallback;
    let okbtn = box.querySelector('button.ok');
    if (okbtn) {
      if (props.confirmCallback) {
        DOM.addClass(box, 'confirm');
        if (okbtn) {
          let btnn = okbtn.cloneNode(true);
          okbtn.parentNode.replaceChild(btnn, okbtn);
          okbtn = btnn;
        }
        DOM.on(okbtn, 'click', props.confirmCallback);
      }
      okbtn.innerText = props.buttonLabel ? props.buttonLabel : 'OK';
    }
    DOM.find(box, 'h2', function(el) {
      el.innerText = title;
    });
    DOM.find(box, 'div.msg', function(el) {
      el.innerHTML = msg;
    });
    if (props.attachHandlers) {
      props.attachHandlers(box);
    }
    if (props.istemporary && this._lastTimeout) {
      clearTimeout(this._lastTimeout);
    }
    if (props.hideAfter) {
      const self = this;
      this._lastTimeout = setTimeout(function() {
        self.hideTemp();
      }, props.hideAfter);
    }
    DOM.visible(box);
    DOM.all('#mbox input[type=text]', function(el) {
      el.focus();
    });
  } else {
    console.log('MBox not initialized! Message:', title, msg);
    alert(title + '\n' + msg);
  }
};

/**
 * Hides modal message box.
 */
_MBox.prototype.hide = function() {
  if (this.initialized) DOM.unvisible(this._element);
};

/**
 * Explicitely hides a temporary message box (internal usage).
 */
_MBox.prototype.hideTemp = function() {
  if (this.initialized) DOM.unvisible(this._elementTemp);
};

const MBox = new _MBox(); // The message box singleton instance

/**
 * Sysex parser.
 * @param {*} deviceConfig {deviceId, maxFileSize}
 */
function Sysex(deviceConfig) {
  this.deviceId = deviceConfig.deviceId;
  this.maxFileSize = deviceConfig.maxFileSize;
}

Sysex.PADDING = new Array(30).fill(0);

Sysex.prototype.parseSysexData = function(data, dataCb, pageCb) {
  if (data.length < 4) {
    throw new Error(STR.sysex.error_data_empty);
  }
  if (data[0] !== 0xf0) {
    throw new Error(STR.sysex.error_no_sysex_data);
  }
  if (data[1] + data[2] + data[3] != 0) {
    // hard coded manufacturer id 0,0,0
    throw new Error(STR.sysex.error_wrong_manufacturer);
  }
  let ix = 4; // start after sysex header
  function nextChunk() {
    if (ix > data.length - 1 - 3) {
      throw new Error(STR.sysex.error_data_incomplete);
    }
    while (data[ix] == 0) {
      ix++;
    } // eat up padding zeros
    let result = {
      cmd: data[ix],
      val: 16 * (data[ix + 1] & 0xf) + (data[ix + 2] & 0xf),
      raw: [data[ix + 1], data[ix + 2]]
    };
    ix += 3;
    return result;
  }

  let finished = false;
  let crcIn = 0;
  let crcCheck = 0;

  let pageData = new Uint8Array(64);
  let pageIndex = 0;
  let pageNumber = 0;
  let version = 0.0;

  while (!finished) {
    let c = nextChunk();
    switch (c.cmd) {
      case 0x41: // CMD_DOWNLOAD_START, device id
        if (c.val != this.deviceId) {
          throw new Error(STR.sysex.error_wrong_device);
        }
        break;
      case 0x42: // CMD_DOWNLOAD_TYPE, 1-3
        // console.log('CMD_DOWNLOAD_TYPE', toHex(c.val));
        if (c.val != 0x03) {
          throw new Error(STR.sysex.error_wrong_download);
        }
        break;
      case 0x43: // CMD_APP_ID_H
        console.log('CMD_APP_ID_H', toHex(c.val));
        version += c.val;
        break;
      case 0x44: // CMD_APP_ID_L
        console.log('CMD_APP_ID_L', toHex(c.val));
        version += c.val / 10;
        break;
      case 0x4b: // CMD_PAGE_CRC_H
        crcIn = 256 * c.val;
        break;
      case 0x4c: // CMD_PAGE_CRC_L
        crcIn += c.val;
        crcCheck = crcCheck & 0xffff;
        if (crcIn != crcCheck) {
          throw new Error(STR.sysex.error_checksum);
        } else {
          if (pageCb) {
            pageCb(pageNumber, pageData);
          }
          // start new page
          pageData = new Uint8Array(64);
          pageIndex = 0;
        }
        crcCheck = 0;
        break;
      case 0x49: // CMD_PAGE_NUM_H
        pageNumber = 256 * c.val;
        break;
      case 0x4a: // CMD_PAGE_NUM_L
        pageNumber += c.val;
        break;
      case 0x4d: // CMD_PAGE_DATA
        dataCb(c);
        crcCheck += c.val;
        pageData[pageIndex] = c.val;
        pageIndex++;
        break;
      case 0x4f: // CMD_DOWNLOAD_STOP
        console.log('CMD_DOWNLOAD_STOP');
        finished = true;
        break;
      default:
        console.log('Unknown CMD', toHex(c.cmd), toHex(c.val));
        break;
    }
  }
  console.log('Data version: ', version);
  return version;
};

/**
 * Returns two sysex bytes for a 8 bit value in [0x20 | high nibble, 0x10 | low nibble ] representation
 * @param {number} v
 */
Sysex.prototype.hiloNibbles = function(v) {
  let hi = ((v & 0xf0) >> 4) + 0x20;
  let lo = (v & 0x0f) + 0x10;
  return [hi, lo];
};

Sysex.prototype.readFile = function(fileelement, dataHandler) {
  let files = fileelement.files;
  if (typeof files === 'undefined' || files.length == 0) {
    MBox.show(STR.sysex.title_error, STR.sysex.error_nofile, { type: 'error' });
    return;
  }
  let file = files[0];
  if (file.size > this.maxFileSize) {
    MBox.show(STR.sysex.title_error, STR.sysex.error_toobig, { type: 'error' });
    return;
  }
  let sysex = this;
  let reader = new FileReader();
  reader.onloadend = function(evt) {
    if (evt.target.readyState == FileReader.DONE) {
      let data = new Uint8Array(evt.target.result);
      try {
        dataHandler(data);
      } catch (e) {
        MBox.show(STR.sysex.title_error, e.message, { type: 'error' });
      }
    }
  };
  reader.readAsArrayBuffer(file);
};

/**
 * Web MIDI interface handler
 * @param {string} deviceName
 * @param {function} sysexMessageHandler
 */
function MIDI(deviceName, sysexMessageHandler, completeHandler) {
  console.log('MIDI: Initializing...');
  const self = this;
  self.midiAccess = null;
  self.deviceIdIn = null;
  self.deviceIdOut = null;
  self.knownInputIds = {};
  self.knownOutputIds = {};
  let select_in = DOM.element('#midiInDeviceId');
  let select_out = DOM.element('#midiOutDeviceId');
  const optionNoDevice = '<option value="">(No devices)</option>';
  const knownPorts = {};

  let trueReported = false;

  const reportStatus = function(available, msg) {
    if (completeHandler) {
      if ((available && !trueReported) || !available) {
        trueReported = available;
        completeHandler(available, msg);
      }
    } else {
      if (available) {
        MBox.hide();
      } else {
        MBox.show(STR.midictrl.title_error, msg, { type: 'error' });
      }
    }
  };

  const onMIDISuccess = function(midiAccess) {
    console.log('MIDI ready!');
    self.midiAccess = midiAccess;
    listInputsAndOutputs();
    selectDevices();
    self.midiAccess.onstatechange = onStateChange;
  };
  const onMIDIFailure = function(msg) {
    console.log('MIDI: Failed to get MIDI access - ' + msg);
    reportStatus(false, STR.midictrl.nomidi);
  };
  const onStateChange = function(e) {
    const port = e.port;
    const state = e.port.state;
    if (state === 'disconnected') {
      knownPorts[port.id] = false;
      listInputsAndOutputs();
      selectDevices();
    } else if (state === 'connected') {
      if (!knownPorts[port.id]) {
        listInputsAndOutputs();
        selectDevices();
      }
    }
  };
  const listInputsAndOutputs = function() {
    let selectedIn = null;
    let selectedOut = null;
    let countIn = 0;
    let countOut = 0;
    DOM.empty(select_in);
    for (let entry of self.midiAccess.inputs) {
      let input = entry[1];
      if (!knownPorts[input.id]) {
        console.log('MIDI: Input device', input.name, input.manufacturer, input.state);
      }
      knownPorts[input.id] = true;
      if (input.name === deviceName) {
        selectedIn = input.id;
        console.log('MIDI: Selected input:', input.name, input.manufacturer, input.state);
      }
      DOM.addHTML(
        select_in,
        'beforeend',
        `<option value="${input.id}">${input.name}</option>`
      );
      countIn++;
    }
    DOM.empty(select_out);
    for (let entry of self.midiAccess.outputs) {
      let output = entry[1];
      if (!knownPorts[output.id]) {
        console.log('MIDI: Output device', output.name, output.manufacturer, output.state);
      }
      knownPorts[output.id] = true;
      if (output.name === deviceName) {
        selectedOut = output.id;
        console.log('MIDI: Selected output', output.name, output.manufacturer, output.state);
      }
      DOM.addHTML(
        select_out,
        'beforeend',
        `<option value="${output.id}">${output.name}</option>`
      );
      countOut++;
    }
    if (selectedIn) {
      select_in.value = selectedIn;
    }
    if (selectedOut) {
      select_out.value = selectedOut;
    }
    console.log('MIDI: ', countIn, 'inputs,', countOut, 'outputs');
    if (countIn == 0 || countOut == 0) {
      let message;
      if (countIn > 0 && countOut == 0) {
        message = STR.midictrl.nooutputs;
        DOM.addHTML(select_out, 'beforeend', optionNoDevice);
      } else if (countIn == 0 && countOut > 0) {
        message = STR.midictrl.noinputs;
        DOM.addHTML(select_in, 'beforeend', optionNoDevice);
      } else {
        message = STR.midictrl.nodevices;
        DOM.addHTML(select_out, 'beforeend', optionNoDevice);
        DOM.addHTML(select_in, 'beforeend', optionNoDevice);
      }
      reportStatus(
        false,
        STR.apply(STR.midictrl.$error_hint, message, deviceName)
      );
    } else {
      reportStatus(true);
    }
  };
  function onMIDIMessage(event) {
    if (event.data && event.data.length > 4) {
      if (event.data[0] == 0xf0 && event.data[event.data.length - 1] == 0xf7) {
        console.log('MIDI: Sysex received', event);
        if (sysexMessageHandler) {
          sysexMessageHandler(event.data);
        }
      }
    }
  }
  function selectDevices() {
    self.deviceIdIn = DOM.find(select_in, 'option:checked')[0].value;
    self.deviceIdOut = DOM.find(select_out, 'option:checked')[0].value;
    self.deviceIn = self.midiAccess.inputs.get(self.deviceIdIn);
    self.deviceOut = self.midiAccess.outputs.get(self.deviceIdOut);
    if (self.deviceIn) {
      self.midiAccess.inputs.forEach(function(entry) {
        entry.onmidimessage = undefined;
      });
      self.deviceIn.onmidimessage = onMIDIMessage;
    } else {
      console.log('MIDI: No input device selected!');
    }
  }
  // go ahead, start midi
  let list = [select_in, select_out];
  list.forEach(function(el) {
    el.addEventListener('change', selectDevices);
  });
  if ('function' === typeof window.navigator.requestMIDIAccess) {
    console.log('MIDI: System has MIDI support.');
    navigator
      .requestMIDIAccess({ sysex: true })
      .then(onMIDISuccess, onMIDIFailure);
  } else {
    console.log('MIDI: System has *no* MIDI support.');
    reportStatus(false, STR.midictrl.nomidisupport);
    DOM.addClass('#midisettings', 'unsupported');
    DOM.all('#midisettings select', function(el) {
      el.disabled = 'disabled';
    });
  }
}

MIDI.prototype.sendSysex = function(data, timeoutms) {
  if (this.deviceOut) {
    console.log('MIDI: Sending as sysex...');
    MBox.show(STR.midictrl.title_send, STR.midictrl.msg_sending, {
      hideAfter: timeoutms || 10000,
      type: 'processing'
    });
    this.deviceOut.send(data);
  } else {
    console.log("MIDI: Can't send sysex. No output device.");
    MBox.show(STR.midictrl.title_send, STR.midictrl.nooutputs, {
      hideAfter: 6000
    });
  }
};

MIDI.prototype.hasOutput = function() {
  return typeof this.deviceOut !== 'undefined';
};

MIDI.prototype.hasInput = function() {
  return typeof this.deviceIn !== 'undefined';
};

function toHex(d, pad) {
  return ('0000' + Number(d).toString(16)).slice(pad ? -pad : -2).toUpperCase();
}
function toBinary(d, pad) {
  return ('0000000000000000' + Number(d).toString(2))
    .slice(pad ? -pad : -2)
    .toUpperCase();
}
