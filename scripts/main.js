import {ExportConfigurator} from "./ExportConfigurator.js"

Hooks.on('getCompendiumDirectoryEntryContext', async function (html, context) {
    context.push({
                     name:     "compendium2module.download",
                     icon:     "<i class='fas fa-save'></i>",
                     callback: li => {
                         if (!game.users.current.isGM) {
                             return false
                         }
                         let pack = game.packs.get(li.data("pack"))
                         let dialogue = new ExportConfigurator(pack)
                         return dialogue.render(true)
                     }
                 })
})
