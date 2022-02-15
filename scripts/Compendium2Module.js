export class Compendium2Module {

    /**
     * @param {string} moduleJSON
     * @param {Object} dbData
     * @param {{id: string, displayName: string, internalName: string, author: string}} moduleOptions
     */
    static async downloadZIP(moduleJSON, dbData, moduleOptions) {
        let zip = new JSZip()
        let parentDir = zip.folder(moduleOptions.id)
        parentDir.file("module.json", moduleJSON)
        let packsDirectory = parentDir.folder("packs")
        for (let key of Object.keys(dbData)) {
            packsDirectory.file(`${key}.db`, dbData[key])
        }

        zip.generateAsync(
            {
                type: "blob",
                platform: "UNIX"
            }
        ).then(content => {
            saveDataToFile(content, "application/zip", `${moduleOptions.id}.zip`)
            ui.notifications.info(game.i18n.localize("compendium2module.info.moduleFinished"))
        })
    }

    /**
     * @param {CompendiumCollection[]|CompendiumCollection} compendiums
     * @param {Object} overrideData
     * @returns {Promise<void>}
     */
    static async generateRequiredFilesForCompendium(compendiums, overrideData) {
        let now = Date.now()
        let isSingleCompendium = compendiums instanceof CompendiumCollection

        let moduleOptions = {
            "id": overrideData.id.length > 0 ? overrideData.id : `generated-compendium-${now}`,
            "author": overrideData.author.length > 0 ? overrideData.author : game.user.name,
            "version": overrideData.version.length > 0 ? overrideData.version : "1.0.0",
            "displayName": overrideData.displayName.length > 0 ? overrideData.displayName : (isSingleCompendium ? compendiums.metadata.label : `Generated Module #${now}`),
            "internalName": overrideData.internalName.length > 0 ? overrideData.internalName : (isSingleCompendium ? compendiums.metadata.name : "")
        }

        let packs = []
        let dbData = {}
        let metadata

        if (!isSingleCompendium) {
            for (let compendium of compendiums) {
                metadata = compendium.metadata
                if (overrideData[`compendium|${metadata.package}|${metadata.name}`] === true) {
                    packs.push({
                        "entity": metadata.type,
                        "label": metadata.displayName,
                        "module": moduleOptions.id,
                        "path": `packs/${metadata.package}-${metadata.name}-${now}.db`,
                        "name": `${metadata.package}-${metadata.name}-${now}`
                    })

                    await compendium.getDocuments()
                    dbData[`${metadata.package}-${metadata.name}-${now}`] = compendium.map(p => JSON.stringify(p)).join("\n")
                }
            }
        } else {
            metadata = compendiums.metadata
            packs.push({
                "entity": metadata.type,
                "label": metadata.displayName,
                "module": moduleOptions.id,
                "path": `packs/${metadata.package}-${metadata.name}-${now}.db`,
                "name": `${metadata.package}-${metadata.name}-${now}`
            })
            await compendiums.getDocuments()
            dbData[`${metadata.package}-${metadata.name}-${now}`] = compendiums.map(p => JSON.stringify(p)).join("\n")
        }

        let moduleJSON = {
            "name": moduleOptions.id,
            "title": game.i18n.localize("compendium2module.json.title").replace("<displayName>", moduleOptions.displayName),
            "description": game.i18n.localize("compendium2module.json.description").replace("<displayName>", moduleOptions.displayName),
            "version": moduleOptions.version,
            "library": "false",
            "manifestPlusVersion": moduleOptions.version,
            "minimumCoreVersion": "9",
            "compatibleCoreVersion": `${parseInt(game.version)}`,
            "author": moduleOptions.author,
            "packs": packs
        }

        ui.notifications.info(game.i18n.localize("compendium2module.info.dataCollected"))

        await Compendium2Module.downloadZIP(JSON.stringify(moduleJSON, null, 4), dbData, moduleOptions)
    }
}