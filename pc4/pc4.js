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
document.addEventListener("DOMContentLoaded", function() {
    let selectedPreset = 0;
    let sysex = new Sysex('PC4');
    // build factory preset data
    let datastore = [];
    for (let i=0;i<16;i++) {
        let preset = [];
        for (let j=0;j<24;j++) {
            // this is how a controller entry looks like
            preset.push({
                'channel': i+1,
                'ccno': j+1,
                'type': 'cc'
            });
        }
        datastore.push(preset);
    }
    let ctrlcontainer = DOM.element("#ctrlcontainer");
    let controlhtml = ctrlcontainer.innerHTML;
    let clipboard = undefined;

    function validateNumber(val, min, max) {
        if (typeof val==='undefined' || isNaN(parseFloat(val)) || !isFinite(val)) {
            return min;
        }
        val = parseInt(val);
        if (val<min) {
            return min;
        }
        else if (val>max) {
            return max;
        }
        else {
            return val;
        }
    }

    function updateView() {
        DOM.empty(ctrlcontainer);
        for (i=0;i<24;i++) {
            DOM.addHTML(ctrlcontainer, 'beforeend', controlhtml);
        }
        let index = 0;
        DOM.find(ctrlcontainer, 'section', function(entry) {
            let cindex = index;
            DOM.addClass(entry, datastore[selectedPreset][index].type);
            let elcc = DOM.find(entry, "input[data-type=ccno]")[0];
            elcc.value = datastore[selectedPreset][index].ccno;
            DOM.on(elcc, 'change', function() {
                var v = validateNumber(elcc.value,0,127);
                datastore[selectedPreset][cindex].ccno = v;
                elcc.value = v;
            });
            let elch = DOM.find(entry, "input[data-type=ch]")[0];
            elch.value = datastore[selectedPreset][index].channel;
            DOM.on(elch, 'change', function() {
                var v = validateNumber(elch.value,1,16);
                datastore[selectedPreset][cindex].channel = v;
                elch.value = v;
            });
            DOM.attachInside(entry, ".select li", 'click', function(ev) {                     
                datastore[selectedPreset][cindex].type = ev.target.className;
                updateView();
            });
            index++;
        });
        DOM.attachInside(ctrlcontainer, ".ctrl input", 'focus', function() { this.select()});
        DOM.removeClass('#preset li','selected');
        DOM.addClass(DOM.all('#preset li')[selectedPreset], 'selected');
    }

    DOM.on('#preset li', 'click', function(ev) {
        let list = DOM.all('#preset li');
        for (let i=0;i<list.length;i++) {
            if (list[i]===ev.target) {
                selectedPreset = i;
                break;
            }
        }
        updateView();
    });

    function sysexHandler(data) {
        try {
            let newdata = sysex.parseSysexData(data);
            Message.show(SPC4.title_data_received, SPC4.msg_apply, {
                confirmCallback: function() {
                    Message.hide();
                    datastore = newdata;
                    selectedPreset = 0;
                    updateView();
                    Message.show(SPC4.title_data_received, SPC4.msg_data_applied, {hideAfter:5000});
                }
            });
        }
        catch(e) {
            Message.show(SPC4.title_data_received, STR.apply(SPC4.$msg_invalid_data ,e.message), {hideAfter:10000, type:'error'});
        }
    }

    updateView();
    var midi = new MIDI("Faderfox PC4", sysexHandler);
    DOM.on('#btntransfer', 'click', function() {
        if (midi.hasOutput()) {
            Message.show(SPC4.title_send, SPC4.msg_send, {
                buttonLabel: "Send",
                confirmCallback: function() {
                    Message.hide();
                    let data = sysex.generateSysexData(datastore);
                    midi.sendSysex(data);
                }
            });
        }
        else {
            Message.show(STR.midictrl.title_error, STR.midictrl.nooutputs, {type:'error'});
        }
    });
    DOM.on('#btnreceive', 'click', function() {
        if (midi.hasInput()) {
            Message.show(SPC4.title_receive, SPC4.msg_receive);
        }
        else {
            Message.show(STR.midictrl.title_error, STR.midictrl.noinputs, {type:'error'});
        }
    });
    DOM.on('#btnallchannels', 'click', function() {
        Message.show(SPC4.title_all_pots, SPC4.msg_all_pots+'<br/><br/><div class="field"><label>Channel:</label>\
                <input name="channel" type="text" size="3" value="" placeholder="#" /></div>', {
            buttonLabel: 'Set channels',
            confirmCallback: function() {
                let inval = DOM.element('#mbox input[name=channel]').value;
                if (inval && inval!=="") {
                    DOM.all("input[data-type=ch]", function(el) {
                        el.value = validateNumber(inval, 1, 16);
                        el.dispatchEvent(new Event('change'));
                    });
                }
                Message.hide();
            }
        });
    });
    DOM.on('#btnfilesave', 'click', function() {
        Message.show(SPC4.title_save, SPC4.msg_save+'<br/><br/><div class="field"><label>Filename:</label><input name="filename" type="text" size="12" value="" placeholder="filename" /><b>.syx</b></div>', 
        {
            buttonLabel: 'Save File',
            confirmCallback: function() {
                let filename = DOM.element('#mbox input[name=filename]').value;
                if (filename && filename!=="") {
                    let data = sysex.generateSysexData(datastore);
                    download(data, filename+".syx", "application/octet-stream" );                    
                }
                Message.hide();
            }
        });
    });
    DOM.on('#btnfileload', 'click', function() {
        Message.show(SPC4.title_load, SPC4.msg_load+'<br/<br/><input type="file" name="file" />', {
            attachHandlers: function(boxelement) {
                DOM.attachInside(boxelement, 'input[type=file]', 'change', function(evt) {
                    sysex.readFile(evt.target, function(data) {
                        if (data) {
                            datastore = data;
                            selectedPreset = 0;
                            updateView();
                            Message.hide();
                            Message.show(SPC4.title_load, SPC4.msg_loaded, {hideAfter:5000});
                        }
                    });
                }); 
            }
        });
    });
    DOM.on('#btncopy', 'click', function() {
        clipboard = datastore[selectedPreset];
        Message.show(SPC4.title_copypaste, STR.apply(SPC4.$msg_copy, selectedPreset+1), { hideAfter: 5000});
    });
    DOM.on('#btnpaste', 'click', function() {
        if (clipboard) {
            Message.show(SPC4.title_copypaste, STR.apply(SPC4.$msg_paste, selectedPreset+1), { 
                confirmCallback: function() {
                    datastore[selectedPreset] = clipboard;
                    updateView();
                    Message.hide();
                    Message.show(SPC4.title_copypaste, SPC4.msg_pasted, { hideAfter: 5000});
                }
            });
        }
        else {
            Message.show(SPC4.title_copypaste, SPC4.msg_clipboard_empty, { hideAfter: 5000});
        }
    });

});