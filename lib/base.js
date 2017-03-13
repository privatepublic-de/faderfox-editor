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
"use strict";
let DOM = {
    element: function(selector) {
        if (typeof selector==='string') {
            return document.querySelector(selector);
        }
        else {
            return selector;
        }
    },
    find: function(rootElement, selector, handler) {
        let list = rootElement.querySelectorAll(selector);
        if (handler) {
            for (let i=0;i<list.length;i++) {
                handler(list[i]);
            }
        }
        return list;
    },
    all: function(selector, handler) {
        let list = [];
        if (selector) {
            if (typeof selector==='string') {
                list = document.querySelectorAll(selector);
            }
            else {
                list = [selector];
            }
        }
        if (handler) {
            for (let i=0;i<list.length;i++) {
                handler(list[i]);
            }
        }
        return list;
    },
    on: function(selector, eventName, handler) {
        DOM.all(selector, function(el){ el.addEventListener(eventName, handler) });
    },
    attachInside: function(rootElement, selector, eventName, handler) {
        DOM.find(rootElement, selector, function(el) {
            DOM.on(el, eventName, handler);
        });
    },
    empty: function(selector) {
        DOM.all(selector, function(el){ el.innerHTML='' });
    },
    hide: function(selector) {
        DOM.all(selector, function(el){ el.style.display = 'none' });
    },
    show: function(selector) {
        DOM.all(selector, function(el){ el.style.display = 'block' });
    },
    addClass: function(selector, className) {
        DOM.all(selector, function(el){ el.classList.add(className) });
    },
    removeClass: function(selector, className) {
        if (className) {
            DOM.all(selector, function(el){ el.classList.remove(className) });
        }
        else {
            DOM.all(selector, function(el){ el.className ='' });
        }
    },
    addHTML: function(selector, position, html) { // 'beforebegin', 'afterbegin', 'beforeend', 'afterend'
        let element = DOM.element(selector);
        element.insertAdjacentHTML(position, html);
        return element;
    }
}

let Message = {
    show: function(title, msg, props) {
        props = props || {};
        props.istemporary = typeof props.hideAfter!=='undefined';
        let box = Message.produce(title, msg, props);
        if (props.istemporary && Message._lastTimeout) {
            clearTimeout(Message._lastTimeout);
        }
        if (props.hideAfter) {
            Message._lastTimeout = setTimeout(function() {Message.hideTemp()}, props.hideAfter);
        }
        DOM.show(box);
        if (box.clientHeight<box.scrollHeight) {
            box.style.height=(box.scrollHeight+20)+'px';
        }
        else {
            box.style.height='';
        }
        DOM.all('#mbox input[type=text]', function(el) {el.focus()});
    },
    hide: function() {
        DOM.hide(Message._element);
    },
    hideTemp: function() {
        DOM.hide(Message._elementTemp);
    },
    produce: function(title, msg, props) {
        let result = null;
        if (props.istemporary) {
            if (typeof Message._elementTemp==='undefined') {
                DOM.addHTML('body', 'beforeend', '<div id="mboxtemp" class="msgbox"><button class="x close">Close</button><h2></h2><div class="msg"></div></div>');
                Message._elementTemp = DOM.element('#mboxtemp');
                DOM.on('#mboxtemp button.x', 'click', function() { Message.hideTemp() });
                DOM.on('#mboxtemp', 'click', function(ev) {ev.stopPropagation()});
            }
            result = Message._elementTemp;
        }
        else {
            if (typeof Message._element==='undefined') {
                DOM.addHTML('body', 'beforeend', '<div id="mbox" class="msgbox"><button class="x close">Close</button><h2></h2><div class="msg"></div><div class="buttons"><button class="ok">OK</button><button class="x">Cancel</button></div></div>');
                Message._element = DOM.element('#mbox');
                DOM.on('#mbox button.x', 'click', function(el) { Message.hide() });
                DOM.on('#mbox', 'click', function(ev) {ev.stopPropagation()});
            }
            result = Message._element;
        }
        DOM.removeClass(result);
        DOM.addClass(result, 'msgbox')
        if (props.type) {
            DOM.addClass(result, props.type);
        }
        let okbtn = result.querySelector('button.ok');
        if (okbtn) {
            if (props.confirmCallback) {
                DOM.addClass(result, 'confirm');
                if (okbtn) {
                    let btnn = okbtn.cloneNode(true);
                    okbtn.parentNode.replaceChild(btnn, okbtn);
                    okbtn = btnn;
                }
                DOM.on(okbtn, 'click', props.confirmCallback);
            }
            okbtn.innerText = props.buttonLabel?props.buttonLabel:'OK';
        }
        DOM.find(result, 'h2', function(el) { el.innerText=title; });
        DOM.find(result, 'div.msg', function(el) { el.innerHTML=msg; });
        if (props.attachHandlers) {
            props.attachHandlers(result);
        }
        return result;
    }
}

function Sysex(deviceName) {
    switch(deviceName) {
        case 'PC4':
            this.deviceId = 0x02;
            break;
        default:
            throw new Error("Unknown device");
    }
}

Sysex._padding = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
Sysex._typemap = {'cc':0x0b, 'pgm':0x0c, 'pb':0x0e };

Sysex.prototype.parseSysexData = function(data) {
    if (data.length===0) {
        throw new Error(STR.sysex.error_data_empty);
    }
    if (data[0]!==0xf0) {
        throw new Error(STR.sysex.error_no_sysex_data);
    }
    if (data[1]+data[2]+data[3] != 0) { // hard coded manufacturer id 0,0,0
        throw new Error(STR.sysex.error_wrong_manufacturer);
    }
    let ix = 4; // start after sysex header
    function nextChunk() {
        if (ix>data.length-1-3) {
            throw new Error(STR.sysex.error_data_incomplete);
        }
        while (data[ix]==0) {ix++}; // eat up padding zeros
        let result = { 'cmd': data[ix], 'val':(16*(data[ix+1]&0xf)) + (data[ix+2]&0xf), 'raw': [data[ix+1], data[ix+2]]};
        ix += 3;
        return result;
    }

    let finished = false;
    let crcIn = 0;
    let crcCheck = 0;
    let ctrlnumber = 0;
    let setupnumber = 0;

    let currentCtrl = {};
    let ctrls = [];
    function addCtrlData(chunk) {
        if (typeof currentCtrl.type==="undefined") {
            let typev = chunk.raw[0] & 0xf;
            let channel = chunk.raw[1] & 0xf;
            let type;
            switch (typev) {
                case 0xc:
                    type = "pgm";
                    break;
                case 0xe:
                    type = "pb";
                    break;
                case 0xb:
                default:
                    type = "cc";
                    break;
            }
            currentCtrl.type = type;
            currentCtrl.channel = channel+1;
        }
        else {
            currentCtrl.ccno = chunk.val;
            ctrls.push(currentCtrl);
            currentCtrl = {};
        }
    }

    while (!finished) {
        let c = nextChunk();
        switch(c.cmd) {
        case 0x41: // CMD_DOWNLOAD_START, device id
            if (c.val!=this.deviceId) {
                console.log(c.val);
                throw new Error(STR.sysex.error_wrong_device);
            }
        break;
        case 0x42: // CMD_DOWNLOAD_TYPE, 1-3
            if (c.val!=0x03) {
                throw new Error(STR.sysex.error_wrong_download);
            }
        break;
        case 0x43: // CMD_APP_ID_H
        case 0x44: // CMD_APP_ID_L
            // ignore for now
        break;
        case 0x4b: // CMD_PAGE_CRC_H
            crcIn += (256*c.val);
        break;
        case 0x4c: // CMD_PAGE_CRC_L
            crcIn += c.val;
        break;
        case 0x4d: // CMD_PAGE_DATA
            addCtrlData(c);
            crcCheck += c.val;
        break;
        case 0x4f: // CMD_DOWNLOAD_STOP
            finished = true;
            break;
        default:
            console.log("ignoring unknown chunk", c.cmd);
            break;
        }
    }
    crcCheck = crcCheck&0xffff;
    if (crcIn!=crcCheck) {
        throw new Error(STR.sysex.error_checksum);
    }
    let result = [];
    for (let i=0;i<16;i++) { // TODO generalize for other devices
        result.push(ctrls.slice(i*24,i*24+24));
    }
    return result;
}

Sysex.prototype.generateSysexData = function(editordata) {
    let deviceparts = this.hilo(this.deviceId);
    let result = [0xf0, 0x00, 0x00, 0x00, 0x41, deviceparts[0], deviceparts[1], 0x42, 0x20, 0x13, 0x43, 0x26, 0x13, 0x44, 0x26, 0x13]; // caution: hardcoded device id pc4
    let crc = 0;
    for (let si=0;si<editordata.length;si++) {
        for (let ci=0;ci<editordata[si].length;ci++) {
            let ctrl = editordata[si][ci];
            result.push(0x4d);
            result.push(0x20 + Sysex._typemap[ctrl.type]);
            result.push(0x10 + (ctrl.channel-1));
            crc += ((Sysex._typemap[ctrl.type]&0xf)*16) + ((ctrl.channel-1)&0xf);
            result = result.concat(Sysex._padding);
            result.push(0x4d);
            let ccv = this.hilo(ctrl.ccno);
            result = result.concat(ccv);
            result = result.concat(Sysex._padding);
            crc += ((ccv[0]&0xf)*16) + (ccv[1]&0xf);
        }
    }
    crc = crc&0xffff;
    result.push(0x4b); // CRC high
    result = result.concat(this.hilo((crc&0xff00)>>8));
    result.push(0x4c); // CRC low
    result = result.concat(this.hilo((crc&0x00ff)));
    result.push(0x4f); // download stop
    result = result.concat(deviceparts);
    result.push(0xf7);

    return new Uint8Array(result);
}

Sysex.prototype.hilo = function(v) {
    let hi = ((v&0xf0)>>4) + 0x20;
    let lo = (v&0x0f) + 0x10;
    return [hi, lo];
}

Sysex.prototype.readFile = function(fileelement, dataHandler) {
    var files = fileelement.files;
    if (!files.length) {
        Message.show(STR.sysex.title_error, STR.sysex.error_nofile, {type:'error'});
        return;
    }
    var file = files[0];
    if (file.size>25*1024) { // TODO per device
        Message.show(STR.sysex.title_error, STR.sysex.error_toobig, {type:'error'});
        return;
    }
    let sysex = this;
    var reader = new FileReader();
    reader.onloadend = function(evt) {
        if (evt.target.readyState == FileReader.DONE) { 
            let data = new Uint8Array(evt.target.result);
            try {
                dataHandler(sysex.parseSysexData(data));
            }
            catch(e) {
                Message.show(STR.sysex.title_error, e.message, {type:'error'});
            }
        }
    };
    reader.readAsArrayBuffer(file);
}



function MIDI(deviceName, sysexHandler) {
    console.log("Initializing MIDI...");
    let self = this;
    self.midiAccess = null;
    self.deviceIdIn = null;
    self.deviceIdOut = null;
    self.ccStorage = {};
    let select_in = DOM.element('#midiInDeviceId');
    let select_out = DOM.element('#midiOutDeviceId');
    const optionNoDevice = '<option value="">(No devices)</option>';

    self.onMIDISuccess = function (midiAccess) {
        console.log("MIDI ready!");
        self.midiAccess = midiAccess;
        self.listInputsAndOutputs();
        self.selectDevices();
        midiAccess.onstatechange = function() {
            console.log("MIDI device state changed");
            self.listInputsAndOutputs();
            self.selectDevices();
        }
    }
    self.onMIDIFailure = function (msg) {
        console.log("Failed to get MIDI access - " + msg);
        self.displayError(STR.midictrl.nomidi);
    }
    self.listInputsAndOutputs = function () {
        let selectedIn = null;
        let selectedOut = null;
        let countIn = 0;
        let countOut = 0;
        DOM.empty(select_in);
        for (let entry of self.midiAccess.inputs) {
            let input = entry[1];
            console.log("Input:", input.name, input.manufacturer, input.state);
            if (input.name===deviceName) {
                selectedIn = input.id;
                console.log("  use as selected device");
            }
            DOM.addHTML(select_in, 'beforeend', `<option value="${input.id}">${input.name}</option>`);
            countIn++;
        }
        DOM.empty(select_out);
        for (let entry of self.midiAccess.outputs) {
            let output = entry[1];
            console.log("Output:", output.name, output.manufacturer, output.state);
            if (output.name===deviceName) {
                selectedOut = output.id;
                console.log("  use as selected device");
            }
            DOM.addHTML(select_out, 'beforeend', `<option value="${output.id}">${output.name}</option>`);
            countOut++;
        }
        if (selectedIn) {
            select_in.value = selectedIn;
        }
        if (selectedOut) {
            select_out.value = selectedOut;
        }
        console.log("Overall:",countIn,"inputs,", countOut, "outputs");
        if (countIn==0 || countOut==0) {
            let message;
            if (countIn>0 && countOut==0) {
                message = STR.midictrl.nooutputs;
                DOM.addHTML(select_out, 'beforeend', optionNoDevice);
            }
            else if (countIn==0 && countOut>0) {
                message = STR.midictrl.noinputs;
                DOM.addHTML(select_in, 'beforeend', optionNoDevice);
            }
            else {
                message = STR.midictrl.nodevices;
                DOM.addHTML(select_out, 'beforeend', optionNoDevice);
                DOM.addHTML(select_in, 'beforeend', optionNoDevice);
            }
            self.displayError(STR.apply(STR.midictrl.$error_hint, message, deviceName));
        }
        else {
            Message.hide();
        }
    }
    self.onMIDIMessage = function (event) {
        if (event.data && event.data.length>4) {
            if (event.data[0]==0xf0 && event.data[event.data.length-1]==0xf7) {
                console.log("Sysex received", event);
                if (sysexHandler) {
                    sysexHandler(event.data);
                }
            }
        }
    }
    self.selectDevices = function() {
        self.deviceIdIn = DOM.find(select_in, 'option:checked')[0].value;
        self.deviceIdOut = DOM.find(select_out, 'option:checked')[0].value;
        self.deviceIn = self.midiAccess.inputs.get(self.deviceIdIn);
        self.deviceOut = self.midiAccess.outputs.get(self.deviceIdOut);
        console.log("Selected MIDI In:", self.deviceIn?self.deviceIn.name:'none',"/ Out:",self.deviceOut?self.deviceOut.name:'none');
        // connect input device
        if (self.deviceIn) {
            self.midiAccess.inputs.forEach(function (entry) { entry.onmidimessage = undefined; });
            self.deviceIn.onmidimessage = self.onMIDIMessage;
        }
        else {
            console.log("No input device selected!");
        }
    }
    self.initUI = function() {
        DOM.all("#midiInDeviceId, #midiOutDeviceId", function(el) { el.addEventListener('change', self.selectDevices); });
    }
    self.displayError = function(msg) {
        if (msg) {
            Message.show(STR.midictrl.title_error, msg, {type:'error'});
        }
    }

    self.sendSysex = function(data) {
        if (self.deviceOut) {
            console.log("Sending as sysex...");
            Message.show(STR.midictrl.title_send, STR.midictrl.msg_sending, {hideAfter:10000, type:'processing'});
            self.deviceOut.send(data);
        }
        else {
            console.log("Can't send sysex. No  output device.");
            Message.show(STR.midictrl.title_send, STR.midictrl.nooutputs, {hideAfter:6000});
        }
    }

    self.hasOutput = function() {
        return typeof self.deviceOut!=='undefined';
    }

    self.hasInput = function() {
        return typeof self.deviceIn!=='undefined';
    }

    // go ahead, start midi
    self.initUI();
    if ('function' === typeof window.navigator.requestMIDIAccess) {
        console.log("System has MIDI support.");
        navigator.requestMIDIAccess({sysex: true}).then(self.onMIDISuccess, self.onMIDIFailure);
    }
    else {
        console.log("System has *no* MIDI support.");
        self.displayError(STR.midictrl.nomidisupport);
        DOM.addClass('#midisettings', 'unsupported');
        DOM.all('#midisettings select', function(el) { el.disabled = 'disabled'});
    }
    
}
