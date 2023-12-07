const dotenv = require('dotenv');
dotenv.config();

const bot_token = process.env.BOT_TOKEN;
const baseApiUrl = process.env.BASE_API_URL;
let full_access_activation_code = process.env.FULL_ACCESS_ACTIVATION_CODE;
let partial_access_activation_code = process.env.PARTIAL_ACCESS_ACTIVATION_CODE;

const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(bot_token, {polling: true, baseApiUrl});

const in_house_db = require('./in_house_db');
const file_helper = require('./file_helper'); 
const stringify = require('./stringify'); 
const path = require('path');
const fs = require('fs');

let initializing = true;

// Delay function to simulate initialization time
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Simulate startup delay for 5 seconds (adjust as needed)
async function startBot() {
    console.log("Bot starting...");
    await delay(3000); // 3 seconds delay

    initializing = false;
    console.log("Bot initialized. Listening to messages.");
}

bot.on('polling_error', (error) => {
    console.log("Polling error code: ",error.code);
    console.log("Error Message: ", error.message);
    console.log("Stack trace: ", error.stack);
});

bot.on('message', async (msg) => {
    if (initializing) {
        console.log("Bot is initializing. Ignoring message.");
        return;
    }
    if(msg.chat.type != 'private'){
        bot.sendMessage(msg.chat.id, "This bot is for private use only!")
        return;
    }
    console.log("Got a message : ", msg?.text?.toString())
});

bot.onText(/\/start/, (msg) => {
    if (initializing) {
        console.log("Bot is initializing. Ignoring message.");
        return;
    }
    if(msg.chat.type != 'private'){
        bot.sendMessage(msg.chat.id, "This bot is for private use only!")
        return;
    }
    bot.setMyCommands([
        {command: '/start', description: 'Welcome message'},
        {command: '/activate_account', description: 'Activate your account'},
        {command: '/list_files', description: 'List of files'},
        {command: '/get_file', description: 'Get a file'},
        {command: '/delete_file', description: 'Delete a file'},
    ]);

    bot.sendMessage(msg.chat.id, "Welcome");
});

bot.onText(/\/delete_file/, async (msg) => {
    if (initializing) {
        console.log("Bot is initializing. Ignoring message.");
        return;
    }
    if(msg.chat.type != 'private'){
        bot.sendMessage(msg.chat.id, "This bot is for private use only!")
        return;
    }
    if(in_house_db.get('activated_accounts')[msg.chat.id] != 'full'){
        bot.sendMessage(msg.chat.id, "Please activate your account using /activate_account");
        return;
    }

    const file_list = file_helper.list_dir();

    // max in a row is 8
    // max is 100 (maybe more)
    const inline_keyboard_array = [];

    // loop through files in steps of 2
    for (let i = 0; i < file_list.files.length; i++) {
        inline_keyboard_array.push(
            [
                {text: file_list.files[i], callback_data: file_list.files[i]},
            ]
        );
    }

    await bot.sendMessage(msg.chat.id,"Please select a file to remove", {
        reply_markup: {
            inline_keyboard: inline_keyboard_array
        }
    });

    async function handleMessage_delete_files(msg) {
        await bot.editMessageText(`Deleting ${msg.data}`, {chat_id: msg.message.chat.id, message_id: msg.message.message_id})

        file_helper.delete_file(msg.data);
        
        await bot.sendMessage(msg.message.chat.id, `File ${msg.data} removed.`);
        bot.removeListener('message', handleMessage_delete_files);
    }

    bot.on('callback_query', handleMessage_delete_files);
});

bot.onText(/\/get_file/, async (msg) => {
    if (initializing) {
        console.log("Bot is initializing. Ignoring message.");
        return;
    }
    if(msg.chat.type != 'private'){
        bot.sendMessage(msg.chat.id, "This bot is for private use only!")
        return;
    }
    if(!in_house_db.get('activated_accounts')[msg.chat.id]){
        bot.sendMessage(msg.chat.id, "Please activate your account using /activate_account");
        return;
    }

    const file_list = file_helper.list_dir();

    // max in a row is 8
    // max is 100 (maybe more)
    const inline_keyboard_array = [];

    // loop through files in steps of 2
    for (let i = 0; i < file_list.files.length; i++) {
        let name = file_list.files[i];
        if(name.length > 45) {
            // get the first element before / if exists
            let dir_array = name.split('/');
            let first_dir = dir_array[0];
            let last_dir = dir_array.slice(-1)[0];
            // remove the first and last and concat them
            let middle_arr = dir_array.slice(1, -1);
            let middle_string = middle_arr.join('/')
            if (first_dir !== last_dir && first_dir.length + last_dir.length < 40){
                middle_string = middle_string.slice(
                    Math.max(middle_string.length - (45 - (first_dir.length + last_dir.length)) , 0))
                name = first_dir+'/...'+middle_string+'/'+last_dir;
            } else if (first_dir !== last_dir && first_dir.length + last_dir.length > 40 && first_dir.length + last_dir.length < 50){
                name = first_dir+'/.../'+last_dir;
            } else if (first_dir !== last_dir) {
                let temp = first_dir+'/...'+last_dir;
                name = temp.slice(Math.max(temp.length - 45, 0))
            } else {
                name = name.slice(Math.max(name.length - 45, 0))
            }
        }
        inline_keyboard_array.push(
            [
                {text: name, callback_data: file_list.files[i]},
            ]
        );
    }

    await bot.sendMessage(msg.chat.id,"Please select a file to get", {
        reply_markup: {
            inline_keyboard: inline_keyboard_array
        }
    });


    async function handleMessage_get_file(msg) {
        await bot.editMessageText(`Geting ${msg.data}`, {chat_id: msg.message.chat.id, message_id: msg.message.message_id})

        var file_path = msg.data;
        file_path = path.join(__dirname, 'storage', file_path);

        await bot.sendDocument(msg.message.chat.id, file_path);
        await bot.sendMessage(msg.message.chat.id, `Geted ${msg.data}`);
        bot.removeListener('message', handleMessage_get_file);
    }

    bot.on('callback_query', handleMessage_get_file);
});

bot.onText(/\/list_files/, (msg) => {
    if (initializing) {
        console.log("Bot is initializing. Ignoring message.");
        return;
    }
    if(msg.chat.type != 'private'){
        bot.sendMessage(msg.chat.id, "This bot is for private use only!")
        return;
    }
    if(!in_house_db.get('activated_accounts')[msg.chat.id]){
        bot.sendMessage(msg.chat.id, "Please activate your account using /activate_account");
        return;
    }

    var data = file_helper.list_dir();

    // if data undefined
    if(data == undefined){
        bot.sendMessage(msg.chat.id, "No file exists here");
    } else {
        var text = stringify.files_list_to_string(data.files, data.dirs)

        bot.sendMessage(msg.chat.id, text);
    }
});

bot.onText(/\/activate_account/, (msg) => {
    if (initializing) {
        console.log("Bot is initializing. Ignoring message.");
        return;
    }
    if(msg.chat.type != 'private'){
        bot.sendMessage(msg.chat.id, "This bot is for private use only!")
        return;
    }
    const activated_accounts = in_house_db.get('activated_accounts');
    const owner = in_house_db.get('owner');

    if (activated_accounts[msg.chat.id] == 'full') {
        bot.sendMessage(msg.chat.id,"Your account is already fully activated");
        return;
    } else if (activated_accounts[msg.chat.id] == 'partial') {
        bot.sendMessage(msg.chat.id,"Your account is already partially activated, to activate fully please enter your activation code or send 'return' to cancel");
        
        async function handleMessage_activate_account_1(msg) {
            if (msg.text.toString() == 'return') {
                bot.sendMessage(msg.chat.id,"Activation canceled");
                return;
            } else if (msg.text.toString().indexOf(full_access_activation_code) === 0) {
                activated_accounts[msg.chat.id] = 'full';
                in_house_db.set('activated_accounts', activated_accounts);

                if (!owner.chat_id) {
                    bot.sendMessage(msg.chat.id,"Your account is activated, Mode: Full - Owner");
                    owner.chat_id = msg.chat.id;
                    in_house_db.set('owner', owner);
                
                } else {
                    bot.sendMessage(msg.chat.id,"Your account is activated, Mode: Full");

                    const data = await bot.getChat(msg.chat.id);
                    bot.sendMessage(owner.chat_id, `New User has activated their account, \nMode: Full \nUsername: ${data.username ? `@${data.username}` : '-'} \nFirst name: ${data.first_name || '-'} \nLast name: ${data.last_name || '-'} ${data.photo ? `\nUser Profile Photo 👇` : ''}`)
                    if(data.photo){
                        var downloaded_file_path = await bot.downloadFile(data.photo.small_file_id, __dirname);
                        await bot.sendPhoto(owner.chat_id, downloaded_file_path)
                        fs.unlinkSync(downloaded_file_path);
                    }
                }
            } else {
                bot.sendMessage(msg.chat.id,"Wrong code, Please try again using /activate_account .");
            }

            bot.removeListener('message', handleMessage_activate_account_1);
        }
    
        bot.on('message', handleMessage_activate_account_1);
    } else {
        bot.sendMessage(msg.chat.id,"Please enter your activation code");
    
        async function handleMessage_activate_account_2(msg) {
            if (msg.text.toString().indexOf(full_access_activation_code) === 0) {
                activated_accounts[msg.chat.id] = 'full';
                in_house_db.set('activated_accounts', activated_accounts);

                if (!owner.chat_id) {
                    bot.sendMessage(msg.chat.id,"Your account is activated, Mode: Full - Owner");
                    owner.chat_id = msg.chat.id;
                    in_house_db.set('owner', owner);
                
                } else {
                    bot.sendMessage(msg.chat.id,"Your account is activated, Mode: Full");

                    const data = await bot.getChat(msg.chat.id);
                    bot.sendMessage(owner.chat_id, `New User has activated their account, \nMode: Full \nUsername: ${data.username ? `@${data.username}` : '-'} \nFirst name: ${data.first_name || '-'} \nLast name: ${data.last_name || '-'} ${data.photo ? `\nUser Profile Photo 👇` : ''}`)
                    if(data.photo){
                        var downloaded_file_path = await bot.downloadFile(data.photo.small_file_id, __dirname);
                        await bot.sendPhoto(owner.chat_id, downloaded_file_path)
                        fs.unlinkSync(downloaded_file_path);
                    }
                }
            } else if (msg.text.toString().indexOf(partial_access_activation_code) === 0) {
                activated_accounts[msg.chat.id] = 'partial';
                in_house_db.set('activated_accounts', activated_accounts);

                bot.sendMessage(msg.chat.id,"Your account is activated, Mode: Partial");

                if (owner.chat_id) {
                    const data = await bot.getChat(msg.chat.id);
                    bot.sendMessage(owner.chat_id, `New User has activated their account, \nMode: Partial \nUsername: ${data.username ? `@${data.username}` : '-'} \nFirst name: ${data.first_name || '-'} \nLast name: ${data.last_name || '-'} ${data.photo ? `\nUser Profile Photo 👇` : ''}`)
                    if(data.photo){
                        var downloaded_file_path = await bot.downloadFile(data.photo.small_file_id, __dirname);
                        await bot.sendPhoto(owner.chat_id, downloaded_file_path)
                        fs.unlinkSync(downloaded_file_path);
                    }
                }
            } else {
                bot.sendMessage(msg.chat.id,"Wrong code, Please try again using /activate_account .");
            }

            bot.removeListener('message', handleMessage_activate_account_2);
        }
    
        bot.on('message', handleMessage_activate_account_2);
    }
});

startBot();