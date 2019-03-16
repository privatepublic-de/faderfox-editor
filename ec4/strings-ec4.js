let SEC4 = {
    title_data_received: "Data received",
    title_send: "Send data to EC4",
    msg_send: "To send the current editor settings to your EC4 device:\
                <ul><li>Enter SETUP mode on your EC4: Press &quot;Func&quot; and select &quot;Setup&quot;</li>\
                <li>Select &quot;Receive&quot; menu; the display shows &quot;Work in progress&quot;</li>\
                <li>Then press the <i>Send</i> button below to start transfer</li>\
                <li>You can monitor the transfer progress on the EC4's display.</li>\
                </ul>",

    msg_apply: "Received setup data from EC4. Apply to editor?",
    msg_data_applied: "Setups from EC4 applied to editor!",
    $msg_invalid_data: "Received invalid sysex data. {}",

    title_receive: "Receive from EC4", 
    msg_receive: "To receive the settings from your EC4 device:\
            <ul><li>Enter SETUP mode on your EC4: Press &quot;Func&quot; and select &quot;Setup&quot;</li>\
            <li>Select &quot;Send&quot; menu</li>\
            <li>Select &quot;Send all setups&quot; and hold the pressed knob until transfer starts</li>\
            <li>You can monitor the transfer progress on the EC4's display.</li></ul>\
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