fx_version 'cerulean'
game 'gta5'
lua54 'yes'
author 'Pixly Games'
description 'Modern UI Interaction System for QBCore'
version '1.0.0'

client_scripts {
    'client/main.lua',
    'client/config.lua'
}

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/script.js',
    'html/style.css'
}

dependencies {
    'qb-core'
}