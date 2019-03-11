let SEC4 = {
    title_data_received: "Data received",
    title_send: "Send data to EC4",
    msg_send: "Set your EC4 to system mode (press left+right button, yellow LED must be on).\
                Then press <i>Send</i> button below to start transfer. Red LED shows data transfer.",

    msg_apply: "Received setup data from EC4. Apply to editor?",
    msg_data_applied: "Setups from EC4 applied to editor!",
    $msg_invalid_data: "Received invalid sysex data. {}",

    title_receive: "Receive from PC4", 
    msg_receive: "Send your current PC4 settings to this editor:\
            <ul><li>Enter system mode (yellow LED must be on)</li>\
            <li>Hold down left shift button and turn pot 24 to right position until yellow LED blinks</li>\
            <li>Release shift key to start data transfer.<br/>Red LED shows data transfer.</li></ul>\
            <p>A message will appear here, after the data has been received.</p>",

    title_save: "Save as sysex file", 
    msg_save: 'Please enter a file name.',
    title_load: "Load a sysex file",
    msg_load: 'Please select a sysex file to load.',
    msg_loaded: 'Sysex file successfully loaded!',

    title_copypaste: 'Copy & Paste',
    $msg_copy: 'Current setup number {} copied to clipboard.',
    $msg_paste: 'Paste clipboard content to current setup number {}? This will overwrite existing values.',
    msg_pasted: 'Pasted clipboard to current setup.',
    msg_clipboard_empty: 'Nothing to paste... clipboard is empty. ',

    title_all_pots: "Set MIDI channel for all pots",
    msg_all_pots: 'Enter a MIDI channel number to be applied to all pots in current setup.'
}