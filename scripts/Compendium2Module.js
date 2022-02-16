export class Compendium2Module {

    /**
     * @param {Object} formData The jQuery selector for the dialog
     * @param {boolean} skipCompendiums If compendiums should be skipped while checking
     * @returns {boolean} If there are any invalid fields.
     */
    static validateFields(formData, skipCompendiums = false) {
        let valid = true
        let id = formData.id

        if (id.length > 0 && id.match(/[^a-z\d\-_]/)) {
            valid = false
            ui.notifications.error(game.i18n.localize("compendium2module.errors.id"), {permanent: true})
        }

        if (skipCompendiums) {
            if (Object.keys(Object.fromEntries(Object.entries(formData).filter(([key, value]) => key.startsWith("compendium") && value))).length === 0) {
                valid = false
                ui.notifications.error(game.i18n.localize("compendium2module.errors.compendiums"), {permanent: true})
            }
        }

        return valid
    }

    /**
     * @param {string} moduleJSON
     * @param {Object} dbData
     * @param {string} moduleId
     */
    static async downloadZIP(moduleJSON, dbData, moduleId) {
        let zip = new JSZip()
        let parentDir = zip.folder(moduleId)
        parentDir.file("module.json", moduleJSON)
        let packsDirectory = parentDir.folder("packs")
        for (let key of Object.keys(dbData)) {
            packsDirectory.file(`${key}.db`, dbData[key])
        }

        zip.generateAsync(
            {
                type:     "blob",
                platform: "UNIX"
            }
        ).then(content => {
            saveDataToFile(content, "application/zip", `${moduleId}.zip`)
            ui.notifications.info(game.i18n.localize("compendium2module.info.moduleFinished"))
        })
    }

    /**
     * @param {CompendiumCollection[]|CompendiumCollection} compendiums
     * @param {Object} overrideData
     * @returns {Promise<void>}
     */
    static async generateRequiredFilesForCompendium(compendiums, overrideData) {
        let now = Date.now().toString()
        let isSingleCompendium = compendiums instanceof CompendiumCollection

        let moduleOptions = {
            "id":          overrideData.id.length > 0 ? overrideData.id : game.i18n.localize("compendium2module.data.generatedId").replace("<timestamp>", now),
            "author":      overrideData.author.length > 0 ? overrideData.author : game.user.name,
            "version":     overrideData.version.length > 0 ? overrideData.version : "1.0.0",
            "displayName": overrideData.displayName.length > 0 ? overrideData.displayName : (isSingleCompendium ? compendiums.metadata.label : `Generated Module #${now}`)
        }

        let packs = []
        let dbData = {}
        let metadata

        if (isSingleCompendium) {
            metadata = compendiums.metadata
            packs.push({
                           "entity": metadata.type,
                           "label":  metadata.displayName,
                           "module": moduleOptions.id,
                           "path":   `packs/${metadata.package}-${metadata.name}-${now}.db`,
                           "name":   `${metadata.package}-${metadata.name}-${now}`
                       })
            await compendiums.getDocuments()
            dbData[`${metadata.package}-${metadata.name}-${now}`] = compendiums.map(p => JSON.stringify(p)).join("\n")
        }
        else {
            for (let compendium of compendiums) {
                metadata = compendium.metadata
                if (overrideData[`compendium|${metadata.package}|${metadata.name}`] === true) {
                    packs.push({
                                   "entity": metadata.type,
                                   "label":  metadata.displayName,
                                   "module": moduleOptions.id,
                                   "path":   `packs/${metadata.package}-${metadata.name}-${now}.db`,
                                   "name":   `${metadata.package}-${metadata.name}-${now}`
                               })

                    await compendium.getDocuments()
                    dbData[`${metadata.package}-${metadata.name}-${now}`] = compendium.map(p => JSON.stringify(p)).join("\n")
                }
            }
        }

        let moduleJSON = {
            "name":                  moduleOptions.id,
            "title":                 game.i18n.localize("compendium2module.json.title").replace("<displayName>", moduleOptions.displayName),
            "description":           game.i18n.localize("compendium2module.json.description").replace("<displayName>", moduleOptions.displayName),
            "version":               moduleOptions.version,
            "library":               "false",
            "manifestPlusVersion":   moduleOptions.version,
            "minimumCoreVersion":    "9",
            "compatibleCoreVersion": `${parseInt(game.version)}`,
            "author":                moduleOptions.author,
            "packs":                 packs
        }

        ui.notifications.info(game.i18n.localize("compendium2module.info.dataCollected"))

        await Compendium2Module.downloadZIP(JSON.stringify(moduleJSON, null, 4), dbData, moduleOptions.id)
    }
}