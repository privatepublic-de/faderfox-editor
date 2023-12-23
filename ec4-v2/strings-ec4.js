let SEC4 = {
  welcome_title: 'Welcome to the Faderfox EC4 Editor (Firmware 2.x)',
  welcome_text: `Before you start: Consider these steps to avoid loss of setup data on your EC4 by accidentially overwriting it.<ul>
    <li>connect your EC4 via USB</li>
    <li>Enter SETUP mode on your EC4: Press &quot;Func&quot; and select &quot;Setup&quot;</li>
    <li>Select &quot;Send&quot; menu</li>
    <li>Press and hold &quot;<b><u>Send all setups</u></b>&quot; until transfer starts</li>
    <li>When the transfer is finished, a message appears here and the data can be applied to the editor</li>
    </ul>
  `,
  title_data_received: 'Data received',
  title_send: 'Send data to EC4',
  warning_send:
    '<p>Warning: Sending the editor data overwrites all setups on the EC4.</p><p>If you want to make a backup copy of your current EC4 setups simply start the &quot;<b><u>Send all setups</u></b>&quot; function on the device *now*. After receiving the data, it will be stored as Sysex file in your downloads folder.<p>Then you can continue to send your editor setups to the EC4.</p>',
  continue_without_backup: 'Continue without backup',
  msg_send:
    "To send the current editor settings to your EC4 device:\
                <ul><li>Enter SETUP mode on your EC4: Press &quot;Func&quot; and select &quot;Setup&quot;</li>\
                <li>Select &quot;Receive&quot; menu; the display shows &quot;Work in progress&quot;</li>\
                <li>Then press the <i>Send</i> button below to start transfer</li>\
                <li>You can monitor the transfer progress on the EC4's display.</li>\
                </ul>\
                <p>This will overwrite all existing setups on the device!</p>\
              ",

  msg_apply: 'Received setup data from EC4. Apply to editor?',
  msg_data_applied: 'Setups from EC4 applied to editor!',
  $msg_invalid_data: 'Received invalid sysex data. {}',
  msg_old_firmware_data: '<p><b>Your EC4 is running on an older firmware version (1.x).</b></p> <p>Please upgrade your device to the latest firmware version before using this editor.</p>  <p>You can use the link &quot;Upgrade EC4 to firmware 2.x&quot; in the top bar of this page.</p>',

  title_receive: 'Receive from EC4',
  msg_receive:
    "To receive the settings from your EC4 device:\
            <ul><li>Enter SETUP mode on your EC4: Press &quot;Func&quot; and select &quot;Setup&quot;</li>\
            <li>Select &quot;Send&quot; menu</li>\
            <li>Select &quot;<b><u>Send all setups</u></b>&quot; and hold the pressed knob until transfer starts</li>\
            <li>You can monitor the transfer progress on the EC4's display.</li></ul>\
            <p>A message will appear here, after the data has been received.</p>",

  title_save: 'Save as Sysex file',
  msg_save: 'Please enter a file name.',
  title_load: 'Load a Sysex file',
  msg_load: 'Please select a Sysex file with EC4 data to load.',
  msg_loaded: 'Sysex file successfully loaded!',

  merge_intro: 'Data received. Please select the setups and groups to import.',
  merge_tooltip_toggle_setup: 'Toggle selection of entire setup',
  merge_tooltip_toggle_group: 'Toggle selection of group',
  merge_no_selection: 'Please select at least one setup or group to import!',
  merge_btn_import: 'Import selected',
  merge_btn_select_all: 'Select all',
  merge_btn_select_none: 'Select none',

  title_copypaste: 'Copy & Paste',
  $msg_copy_setup: 'Current setup {} copied to clipboard.',
  $msg_copy_group: 'Current group {} copied to clipboard.',
  $msg_paste_group:
    'Paste clipboard content to selected <b>group #{}</b>?<br/>This will overwrite existing values.',
  $msg_paste_setup:
    'Paste clipboard content to selected <b>setup #{}</b>?<br/>This will overwrite existing values.',
  msg_pasted: 'Pasted clipboard data.',
  msg_clipboard_empty: 'Nothing to paste... clipboard is empty. ',

  title_fillnumbers: 'Fill from top left to bottom right',
  title_fillnumbers_bottom: 'Fill from bottom left to top right',
  $msg_fillnumbers:
    'Fill all encoder\'s <b>{}</b> in this group in ascending order starting with &quot;{}&quot; (value of encoder #1)?',
  $msg_fillnumbers_bottom:
    'Fill all encoder\'s <b>{}</b> in this group in ascending order from bottom left to top right starting with &quot;{}&quot; (value of encoder #13)?',

  title_upgrade:
    'Update firmware on EC4 to Version 2.0',
  msg_upgrade:
    `
      <p>Before you start: <b>Make a backup of your current EC4 setup data!</b></p>
      <ul>
        <li>If your <b>EC4 is still running a firmware version 1.x</b>, please use the previous
        editor version to make a backup. Click this link to open <a href="../ec4/index.html">EC4 Editor for Firmware 1.x</a>. You will be guided through the backup process there.
        </li>
        <li>If your EC4 is already running with a firmware version 2.x make a backup as recommended
        when opening this page.
        </li>
      </ul>
      <p>Start the update process:</p>
      <ul>
        <li>Disconnect your EC4 from the USB connection to this computer</li>
        <li>Press the red &quot;Shift&quot; key while reconnecting the USB cable.</li>
        <li>The display should read &quot;Ready to receive&quot;</li>
        <li>Press the button &quot;Send update to EC4&quot; below</li>
        <li>Wait until the device received 100% of the firmware data and reboots</li>
        <li>Congratulations! Update was successful.</li>
      </ul>
      <p>Now you can load your backup file and transmit it to the EC4
        with this editor. The setup data will be automatically converted to Version 2.x.</p>
    `
};
