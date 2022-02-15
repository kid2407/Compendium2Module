export class Compendium2Module {

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
        let moduleOptions = {
            "id":           overrideData.id.length > 0 ? overrideData.id : `generated-compendium-${Date.now()}`,
            "displayName":  overrideData.displayName.length > 0 ? overrideData.displayName : metadata.label,
            "internalName": overrideData.internalName.length > 0 ? overrideData.internalName : metadata.name,
            "author":       overrideData.author.length > 0 ? overrideData.author : game.user.name,
            "version":      overrideData.version.length > 0 ? overrideData.version : "1.0.0"
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
            "packs":                 [
                {
                    "entity": metadata.type,
                    "label":  moduleOptions.displayName,
                    "module": moduleOptions.id,
                    "path":   `packs/${moduleOptions.id}.db`,
                    "name":   moduleOptions.internalName
                }
            ]
        }

        await compendium.getDocuments()
        let dbContent = compendium.map(p => JSON.stringify(p)).join("\n")

        await Compendium2Module.downloadZIP(JSON.stringify(moduleJSON, null, 4), dbContent, moduleOptions)
    }
}