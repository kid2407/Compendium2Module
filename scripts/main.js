import {SimpleExporter} from "./SimpleExporter.js"
import {AdvancedExporter} from "./AdvancedExporter.js"

Hooks.on('getCompendiumDirectoryEntryContext', async (html, context) => {
    // noinspection JSUnusedGlobalSymbols
    context.push({
                     name:     "compendium2module.download",
                     icon:     "<i class='fas fa-save'></i>",
                     callback: li => {
                         if (!game.users.current.isGM) {
                             return false
                         }
                         let pack = game.packs.get(li.data("pack"))
                         let dialogue = new SimpleExporter(pack)
                         return dialogue.render(true)
                     }
                 })
})

Hooks.on('renderSidebarTab', async function (app, html) {
    if (app.options.id === "compendium" && game.user.isGM) {
        let button = $(`<div class='header-actions action-buttons flexrow'><button class='c2m-button'><i class='fas fa-save'></i> ${game.i18n.localize("compendium2module.button")}</button></div>`)
        button.on('click', async () => {
            if (!game.users.current.isGM) {
                return false
            }
            let dialog = new AdvancedExporter()
            return dialog.render(true)
        })

        $(html).find(".directory-header").append(button)
    }
})