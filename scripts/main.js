import {Compendium2Module} from "./Compendium2Module.js";

Hooks.on('getCompendiumDirectoryEntryContext', async function (html, context) {
    context.push({
        name: "compendium2module.download",
        icon: "<i class='fas fa-save'></i>",
        callback: li => {
            if (!game.users.current.isGM) {
                return false
            }
            return Dialog.confirm({
                title: `${game.i18n.localize("compendium2module.dialogue.title")}`,
                content: `<p>${game.i18n.localize("compendium2module.dialogue.content")}</p>`,
                yes: () => {
                    let pack = game.packs.get(li.data("pack"))
                    Compendium2Module.generateRequiredFilesForCompendium(pack)
                },
                options: {
                    top: Math.min(li[0].offsetTop, window.innerHeight - 350),
                    left: window.innerWidth - 720,
                    width: 400
                }
            })
        }
    })
})
