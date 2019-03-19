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

    title_save: "Save as Sysex file", 
    msg_save: 'Please enter a file name.',
    title_load: "Load a Sysex file",
    msg_load: 'Please select a Sysex file with EC4 data to load.',
    msg_loaded: 'Sysex file successfully loaded!',

    title_copypaste: 'Copy & Paste',
    $msg_copy_setup: 'Current setup {} copied to clipboard.',
    $msg_copy_group: 'Current group {} copied to clipboard.',
    $msg_paste_group: 'Paste clipboard content to selected <b>group #{}</b>?<br/>This will overwrite existing values.',
    $msg_paste_setup: 'Paste clipboard content to selected <b>setup #{}</b>?<br/>This will overwrite existing values.',
    msg_pasted: 'Pasted clipboard data.',
    msg_clipboard_empty: 'Nothing to paste... clipboard is empty. ',

    title_fillnumbers: 'Fill command numbers',
    $msg_fillnumbers: 'Fill all encoder <b>{}</b> in this group in ascending order starting with &quot;{}&quot; (value of encoder #1)?'
}