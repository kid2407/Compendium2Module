export class Compendium2Module {

    static IS_FOUNDRY_V8 = null;

    /**
     * Async for each loop
     *
     * @param  {array} array - Array to loop through
     * @param  {function} callback - Function to apply to each array item loop
     */
    static async asyncForEach(array, callback) {
        for (let index = 0; index < array.length; index += 1) {
            await callback(array[index], index, array)
        }
    }

    /**
     * @param {Object} formData The jQuery selector for the dialog
     * @returns {boolean} If there are any invalid fields.
     */
    static validateFields(formData) {
        let valid = true
        let id = formData.id

        if (id.length > 0 && id.match(/[^a-z\d\-_]/)) {
            valid = false
            ui.notifications.error(game.i18n.localize("compendium2module.errors.id"), {permanent: true})
        }

        if (Object.keys(Object.fromEntries(Object.entries(formData).filter(([key, value]) => key.startsWith("compendium") && value))).length === 0) {
            valid = false
            ui.notifications.error(game.i18n.localize("compendium2module.errors.compendiums"), {permanent: true})
        }

        return valid
    }

    /**
     * @param {string} moduleId The module ID
     * @param {string} moduleJSON The content for the module.json file
     * @param {{data: {string: string}, images: string[]}} dbData The data for the compendiums that are included with the module
     * @param {FormApplication} formApplication
     */
    static async downloadZIP(moduleId, moduleJSON, dbData, formApplication) {
        let zip = new JSZip()
        let parentDir = zip.folder(moduleId)
        parentDir.file("module.json", moduleJSON)
        let packsDirectory = parentDir.folder("packs")

        for (let key of Object.keys(dbData.data)) {
            packsDirectory.file(`${key}.db`, dbData.data[key])
        }

        if (dbData.images.length > 0) {
            ui.notifications.info(game.i18n.localize("compendium2module.assets.start"))
            let assets = parentDir.folder("assets")
            let request
            let imageContent

            await this.asyncForEach(dbData.images, async (image) => {
                try {
                    request = await fetch(image)
                    if (!request.ok) {
                        ui.notifications.warn(game.i18n.localize("compendium2module.assets.notFound").replace("<filename>", image))
                        return
                    }
                    imageContent = await request.blob()
                    assets.file(image, imageContent)
                } catch (e) {
                    ui.notifications.warn(game.i18n.localize("compendium2module.assets.notFound").replace("<filename>", image))
                }
            })

            ui.notifications.info(game.i18n.localize("compendium2module.assets.finish"))
        }

        zip.generateAsync(
            {
                type    : "blob",
                platform: "UNIX"
            }
        ).then(content => {
            saveDataToFile(content, "application/zip", `${moduleId}.zip`)
            ui.notifications.info(game.i18n.localize("compendium2module.info.moduleFinished"))
            formApplication.close({force: true}).then()
        })
    }

    /**
     * @param {Document[]} compendiumData
     * @param {string[]} imagePaths
     * @returns {string[]}
     */
    static collectImagePathsFromCompendium(compendiumData, imagePaths) {
        let path = ''

        for (let compendiumEntry of compendiumData) {
            path = compendiumEntry.data.img
            if (!imagePaths.includes(path)) {
                imagePaths.push(path)
            }
            if (compendiumEntry.data.type === "character") {
                path = compendiumEntry.data.token.img
                if (!imagePaths.includes(path)) {
                    imagePaths.push(path)
                }
            }
        }

        return imagePaths
    }

    /**
     * @param {Document[]} documents
     * @param {string} moduleId
     * @param {boolean} includeImages
     * @param {string[]} images
     * @returns {{images: string[], data: string}}
     */
    static transformCompendiumData(documents, moduleId, includeImages, images = []) {
        images = includeImages ? Compendium2Module.collectImagePathsFromCompendium(documents, images) : images
        let documentData = []
        documents.forEach(d => {
            let json = d.toJSON()
            if (includeImages) {
                json.img = `modules/${moduleId}/assets/${json.img}`
                if (json.type === "character") {
                    json.token.img = `modules/${moduleId}/assets/${json.token.img}`
                }
            }
            documentData.push(json)
        })

        return {
            "data"  : documentData.map(p => JSON.stringify(p)).join("\n"),
            "images": images
        }
    }

    // noinspection JSCheckFunctionSignatures
    /**
     * @param {CompendiumCollection[]|CompendiumCollection} compendiums
     * @param {Object} overrideData
     * @param {FormApplication} formApplication
     * @returns {Promise<void>}
     */
    static async generateRequiredFilesForCompendium(compendiums, overrideData, formApplication) {
        let now = Date.now().toString()
        let isSingleCompendium = compendiums instanceof CompendiumCollection

        let moduleOptions = {
            "id"           : overrideData.id.length > 0 ? overrideData.id : game.i18n.localize("compendium2module.data.generatedId").replace("<timestamp>", now),
            "author"       : overrideData.author.length > 0 ? overrideData.author : game.user.name,
            "version"      : overrideData.version.length > 0 ? overrideData.version : "1.0.0",
            "displayName"  : overrideData.displayName.length > 0 ? overrideData.displayName : (isSingleCompendium ? compendiums.metadata.label : `Generated Module #${now}`),
            "includeImages": overrideData.includeImages
        }

        let packs = []
        let dbData = {
            "images": [],
            "data"  : {}
        }
        let metadata
        let documents
        let images = []
        let transformedData
        let packName

        if (isSingleCompendium) {
            metadata = compendiums.metadata
            packName = `${metadata.package}-${metadata.name}-${now}`

            if (this.IS_FOUNDRY_V8){
                packs.push({
                   "entity": metadata.type,
                   "label":  metadata.label,
                   "module": moduleOptions.id,
                   "path":   `packs/${packName}.db`,
                   "name":   `${packName}`
                })
            } else {
                packs.push({
                   "type"  : metadata.type,
                   "label" : metadata.label,
                   "module": moduleOptions.id,
                   "path"  : `packs/${packName}.db`,
                   "name"  : `${packName}`
                })
            }
            documents = await compendiums.getDocuments()
            transformedData = Compendium2Module.transformCompendiumData(documents, moduleOptions.id, moduleOptions.includeImages, images)
            images = transformedData.images
            dbData.data[packName] = transformedData.data
        } else {
            for (let compendium of compendiums) {
                metadata = compendium.metadata
                if (overrideData[`compendium|${metadata.package}|${metadata.name}`] === true) {
                    packName = `${metadata.package}-${metadata.name}-${now}`

                    if (this.IS_FOUNDRY_V8){
                        packs.push({
                            "entity"  : metadata.type,
                            "label" : metadata.label,
                            "module": moduleOptions.id,
                            "path"  : `packs/${packName}.db`,
                            "name"  : `${packName}`
                        })
                    } else {
                        packs.push({
                            "type"  : metadata.type,
                            "label" : metadata.label,
                            "module": moduleOptions.id,
                            "path"  : `packs/${packName}.db`,
                            "name"  : `${packName}`
                        })
                    }

                    documents = await compendium.getDocuments()
                    transformedData = Compendium2Module.transformCompendiumData(documents, moduleOptions.id, moduleOptions.includeImages, images)
                    images = transformedData.images
                    dbData.data[packName] = transformedData.data
                }
            }
        }

        let moduleJSON = {
            "name"                 : moduleOptions.id,
            "title"                : moduleOptions.displayName,
            "description"          : game.i18n.localize("compendium2module.json.description").replace("<displayName>", moduleOptions.displayName),
            "version"              : moduleOptions.version,
            "library"              : "false",
            "manifestPlusVersion"  : moduleOptions.version,
            "minimumCoreVersion"   : "9",
            "compatibleCoreVersion": `${parseInt(game.version)}`,
            "author"               : moduleOptions.author,
            "packs"                : packs
        }

        dbData.images = images

        ui.notifications.info(game.i18n.localize("compendium2module.info.dataCollected"))

        // noinspection JSCheckFunctionSignatures
        return Compendium2Module.downloadZIP(moduleOptions.id, JSON.stringify(moduleJSON, null, 4), dbData, formApplication)
    }
}