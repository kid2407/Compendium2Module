export class Compendium2Module {
    static PATH_MODULE_JSON = 'modules/compendium2module/templates/module.json'

    /**
     * @param {string} moduleJSON
     * @param {string} dbData
     * @param {{id: string, displayName: string, internalName: string, author: string}} moduleOptions
     */
    static async downloadZIP(moduleJSON, dbData, moduleOptions) {
        let zip = new JSZip()
        let parentDir = zip.folder(moduleOptions.id)
        parentDir.file("module.json", moduleJSON)
        let packs = parentDir.folder("packs")
        packs.file(`${moduleOptions.id}.db`, dbData)

        zip.generateAsync(
            {
                type:     "blob",
                platform: "UNIX"
            }
        ).then(content => {
            saveDataToFile(content, "application/zip", `${moduleOptions.id}.zip`)
        })
    }

    /**
     * @param {CompendiumCollection} compendium
     * @param {Object} overrideData
     * @returns {Promise<void>}
     */
    static async generateRequiredFilesForCompendium(compendium, overrideData) {
        let metadata = compendium.metadata
        let moduleJSON = null
        let moduleOptions = {
            "id":           overrideData["id"].length > 0 ? overrideData["id"] : `generated-compendium-${Date.now()}`,
            "displayName":  overrideData["displayName"].length > 0 ? overrideData["displayName"] : metadata.label,
            "internalName": overrideData["internalName"].length > 0 ? overrideData["internalName"] : metadata.name,
            "author":       overrideData["author"].length > 0 ? overrideData["author"] : game.user.name
        }

        try {
            await FilePicker.browse("data", Compendium2Module.PATH_MODULE_JSON)
            let request = await fetch(Compendium2Module.PATH_MODULE_JSON)
            moduleJSON = await request.text()

            moduleJSON = moduleJSON.replaceAll("<id>", moduleOptions["id"])
            moduleJSON = moduleJSON.replaceAll("<displayName>", moduleOptions["displayName"])
            moduleJSON = moduleJSON.replaceAll("<internalName>", moduleOptions["internalName"])
            moduleJSON = moduleJSON.replaceAll("<user>", moduleOptions["author"])
            moduleJSON = moduleJSON.replaceAll("<type>", metadata.type)
            moduleJSON = moduleJSON.replaceAll("<version>", parseInt(game.version))
        } catch (e) {
            console.error(e)
            ui.notifications.error(game.i18n.localize("compendium2module.errors.moduleJsonFailed"))
            return
        }

        let dbContent = null
        let compendiumPackage = metadata.package
        let basePath = `${compendiumPackage}${metadata.path.charAt(0) === '.' ? metadata.path.substring(1) : metadata.path}`
        let path = null
        let foundPath = false

        try {
            try {
                path = `modules/${basePath}`
                await FilePicker.browse("data", path)
                foundPath = true
                console.log(`Found module path! ${path}`)
            } catch (e) {
                console.log("Not a module")
            }

            if (!foundPath) {
                try {
                    path = `systems/${basePath}`
                    await FilePicker.browse("data", path)
                    foundPath = true
                    console.log(`Found system path! ${path}`)
                } catch (e) {
                    console.log("Not a system")
                }
            }

            if (!foundPath) {
                ui.notifications.error(game.i18n.localize("compendium2module.errors.openCompendiumFailed"))
                return
            }

            let request = await fetch(path)
            dbContent = await request.text()
        } catch (e) {
            console.error(e)
            ui.notifications.error(game.i18n.localize("compendium2module.errors.compendiumLoadingFailed").replace("%s", metadata.label))
            return
        }

        if (moduleJSON === null || dbContent === null || path === null) {
            ui.notifications.error(game.i18n.localize("compendium2module.errors.unknown"))
            console.log(moduleJSON, dbContent, compendium)
            return
        }

        await Compendium2Module.downloadZIP(moduleJSON, dbContent, moduleOptions)
    }
}