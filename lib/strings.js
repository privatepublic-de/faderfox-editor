const STR_USE_WITHOUT_MIDI = "<br/><br/>You can still use this editor to edit, load and save Sysex files that can be transfered to the device with a Sysex dump tool.";
const STR = {
    apply: function(templateString) {
        let c = arguments.length-1;
        for (let i=0;i<c;i++) {
            templateString = templateString.replace('{}', arguments[i+1]);
        }
        return templateString;
    },
    midictrl: {
        nomidi: "Failed to get MIDI access. Please <a href='javascript:window.location.reload()'>try reloading this page</a> and confirm MIDI access when the browser is asking for it."+STR_USE_WITHOUT_MIDI,
        nooutputs: "No MIDI output devices present!",
        noinputs: "No MIDI input devices present!",
        nodevices: "No MIDI devices present!"+STR_USE_WITHOUT_MIDI,
        nomidisupport: "Sorry, no MIDI support in this browser. So far, the only browsers supporting MIDI are Chrome and Open Source Chromium."+STR_USE_WITHOUT_MIDI,
        title_error: "MIDI Error",
        title_send: "Send data",
        msg_sending: "Sending data... Please check the receiving device for transfer confirmation.",
        $error_hint: "{} Connect your {} to this computer via USB and then <a href='javascript:window.location.reload()'>reload this page</a>."
    },
    sysex: {
        title_error: "Error with Sysex Data",
        error_nofile: "No file selected.",
        error_toobig: "File is too big.",
        error_checksum: "Data transfer error. Wrong checksum.",
        error_wrong_download: "Wrong download type.",
        error_wrong_device: "Data is from another device.",
        error_wrong_manufacturer: "Data is from an unknown device.",
        error_no_sysex_data: "This is no Sysex-data.",
        error_data_empty: "Data is empty.",
        error_data_incomplete: "Data is incomplete."
    }
}