"use strict";

class Selection {

    constructor(updatecallback) {
        this.s = 0;
        this.g = 0;
        this.e = 0;
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
        if (v!==this.s) {
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

}

document.addEventListener("DOMContentLoaded", function() {
    const sel = new Selection(selection => {
        console.log(`>> Selection ${selection.setup}, ${selection.group}, ${selection.encoder}`);
        // sync values
        DOM.removeClass('#ctrlcontainer .enc', 'selected');
        DOM.addClass(`#ctrlcontainer #enc${selection.encoder}`, 'selected');
    });
    let sysex = new Sysex('EC4');
    let allData = new Uint8Array(50240);
    const dataOffset = 0x1BC0;
    const startSetupNames = dataOffset - dataOffset;
    const startGroupNames = 0x1C00 - dataOffset;
    const startPresets = 0x2000 - dataOffset;
    const nameChars = new RegExp('[A-Za-z0-9.\\-/ ]');

    function createNameInput(id, value) {
        let inp = document.createElement('input');
        inp.setAttribute('id',id);
        inp.setAttribute('type','text');
        inp.setAttribute('data-watch', 'name');
        inp.setAttribute('maxlength',4);
        inp.setAttribute('value',value || '');
        return inp;
    }
    let sulist = document.createElement('ul')
    sulist.setAttribute('id', 'browser');
    for (let su=0;su<16;su++) {
        let li = document.createElement('li');
        li.setAttribute('data-action', 'select-setup');
        li.setAttribute('data-number', su);
        if (su===0) {
            li.classList.add('selected');
        }
        let grlist = document.createElement('ul');
        for (let gr=0;gr<16;gr++) {
            let grli = document.createElement('li');
            grli.setAttribute('data-action', 'select-group');
            grli.setAttribute('data-number', gr);
            if (gr===0) {
                grli.classList.add('selected');
            }
            grli.appendChild(createNameInput(`s${su}g${gr}`,'GR'+(gr<9?'0':'')+(gr+1)));
            grlist.appendChild(grli);
        }
        li.appendChild(createNameInput(`s${su}`, 'SE'+(su<9?'0':'')+(su+1)));
        li.appendChild(grlist);
        sulist.appendChild(li);
    }
    DOM.element('#preset').prepend(sulist);

    // build encoders
    for (let i=0; i<16; i++) {
        const twodig = (i<9?'0':'') + (i+1);
        let html = `<section><div id="enc${i}" data-action="select-encoder" data-enc="${i}" class="enc"><div class="knob"></div><div class="n"><input data-watch="name" id="enc_name${i}" type="text" maxlength="4" value="EC${twodig}" /></div><div class="v"><div class="val"><label></label><input data-watch="numb" id="enc_value${i}" type="text" value="0" /></div><div class="disp"><label></label><select data-watch="disp"><option>display off</option><option>0...127</option><option>0...100</option><option>0...1000</option><option>-63...+63</option><option>-50...+50</option><option>-500...+500</option><option>ON / OFF</option></select></div><div class="type"><label></label><select data-watch="type"><option>CC relative 1</option><option>CC relative 2</option><option>CC absolute</option><option>Program change</option><option>CC absolute 14bit</option><option>Pitch bend</option><option>Aftertouch</option><option>Note</option></select></div><div class="mode"><label></label><select data-watch="mode"><option>no acceleration</option><option>low acceleration</option><option>mid acceleration</option><option>max acceleration</option></select></div></div></div></section>`;
        DOM.addHTML('#ctrlcontainer', 'beforeend', html);
    }

    function selectEncoder(e) {
        let selectedId = -1;
        switch (e.type) {
            case 'click':
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
                    return;
                }
                let el = e.target;
                while (!el.getAttribute('data-enc')) {
                    el = el.parentElement;
                }
                selectedId = el.getAttribute('data-enc');
            break;
            case 'change':
                selectedId = e.target.selectedIndex;
            break;
        }
        if (selectedId>-1) {
            sel.encoder = selectedId;
        }
    }

    const editLabel = {
        'edit-disp': 'Display',
        'edit-type': 'Type',
        'edit-mode': 'Mode',
        'edit-chan': 'Channel',
        'edit-numb': 'CC-Number',
        'edit-lowr': 'Lower',
        'edit-uppr': 'Upper'
    };

    function actionHandler(e) {
        const action = e.currentTarget.getAttribute('data-action');
        console.log(`Action ${action}`);
        if (action.indexOf('edit-') === 0) {
            DOM.all('#ctrlcontainer .enc label', e=>{
                e.innerText = editLabel[action];
            });
        }
        switch (action) {
            case 'select-setup':
            case 'select-group':
                DOM.removeClass(e.currentTarget.parentElement.childNodes, 'selected');
                DOM.addClass(e.currentTarget, 'selected');
                let number = e.currentTarget.getAttribute('data-number');
                if (action === 'select-setup') {
                    sel.setup = number;
                } else {
                    sel.group = number;
                }
                break;
            case 'select-encoder':
                selectEncoder(e);
                break;
            case 'edit-disp':
                DOM.element('#ctrlcontainer').className = 'disp';
                break;
            case 'edit-type':
                DOM.element('#ctrlcontainer').className = 'type';
                break;                
            case 'edit-mode':
                DOM.element('#ctrlcontainer').className = 'mode';
                break;
            case 'edit-chan':
            case 'edit-numb':
            case 'edit-lowr':
            case 'edit-uppr':
                DOM.element('#ctrlcontainer').className = 'val';
                break;
        }
    }

    DOM.all('*[data-action]', e=> {
        e.addEventListener('click', actionHandler);
    });

    function checkKey(e) {
        let allowed = true;
        if (e.key.length===1) {
            if (!nameChars.test(e.key)) {
                allowed = false;
            }
        }
        if (!allowed) {
            e.preventDefault();
        }
        return allowed;
    }
    function watchHandler(e) {
        const what = e.currentTarget.getAttribute('data-watch') || e.target.getAttribute('data-watch');
        console.log(`Watch ${what}`);
        switch (what) {
            case 'name':
                return checkKey(e);
            break;
            case 'select-encoder':
                selectEncoder(e);
            break;
        }
    }

    DOM.all('*[data-watch]', e=> {
        switch (e.tagName) {
            case 'SELECT': 
                e.addEventListener('change', watchHandler);
            break;
            case 'INPUT':
                e.addEventListener('keydown', watchHandler);
            break;
        }
    });

    DOM.on('#btnfileload', 'click', function() {
        MBox.show(SEC4.title_load, SEC4.msg_load+'<br/<br/><input type="file" name="file" />', {
            attachHandlers: function(boxelement) {
                DOM.attachInside(boxelement, 'input[type=file]', 'change', function(evt) {
                    sysex.readFile(evt.target, function(data) {
                        if (data) {
                            allData.fill(0);
                            sysex.parseSysexData(data, chunk => {}, (addr, pagedata)=>{
                                allData.set(pagedata, addr - dataOffset);
                            });
                            for (let i=0; i<16; i++) {
                                let name = allData.subarray(startSetupNames + i*4, startSetupNames + i*4+4);
                                DOM.element(`#s${i}`).value = String.fromCharCode(name[0], name[1], name[2], name[3]);
                                for (let j=0; j<16; j++) {
                                    let name = allData.subarray(startGroupNames + i*64 + j*4, startGroupNames + i*64 + j*4 + 4);
                                    DOM.element(`#s${i}g${j}`).value = String.fromCharCode(name[0], name[1], name[2], name[3]);
                                }
                            }
                            MBox.hide();
                            MBox.show(SEC4.title_load, SEC4.msg_loaded, {hideAfter:5000});
                        }
                    });
                }); 
            }
        });
    });

    sel.setAll(0, 0, 0);

});