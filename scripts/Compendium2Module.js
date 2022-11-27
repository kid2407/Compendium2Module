export class Compendium2Module {

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
        let id    = formData.id

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
     * @param {boolean} saveToFile If the module should be saved to the local file system
     */
    static async generateZIP(moduleId, moduleJSON, dbData, formApplication, saveToFile) {
        let zip       = new JSZip()
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

            await this.asyncForEach(dbData.images.filter((value => {
                try {
                    new URL(value)
                    return false
                } catch (e) {
                    return true
                }
            })), async (image) => {
                try {
                    request = await fetch(image)
                    if (!request.ok) {
                        ui.notifications.warn(game.i18n.localize("compendium2module.assets.notFound").replace("<filename>", image))
                        return
                    }
                    imageContent = await request.blob()
                    assets.file(decodeURI(image), imageContent)
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
        ).then(async content => {
            if (saveToFile) {
                let moduleDir = `compendium2module/${moduleId}`

                try {
                    await FilePicker.createDirectory('data', 'compendium2module')
                } catch (e) {
                    // Ignore
                }

                try {
                    await FilePicker.createDirectory('data', `compendium2module/${moduleId}`)
                } catch (e) {
                    // Ignore
                }

                await FilePicker.upload('data', moduleDir, new File([new Blob([moduleJSON], {type: "application/json"})], "module.json"), {}, {notify: false})
                await FilePicker.upload('data', moduleDir, new File([new Blob([content], {type: "application/zip"})], "module-zip.txt"), {}, {notify: false})

                let dialog       = $('.compendium2moduleDialog')
                let manifestLink = dialog.find('input.manifestLink')
                manifestLink.val(new URL(`${window.location.origin}/compendium2module/${moduleId}/module.json`).href)
                dialog.find('button#cancel').html(`<i class='fas fa-ban'></i>${game.i18n.localize('compendium2module.edit.close')}`)
                let generateButton     = dialog.find('button#generate')
                let generateButtonIcon = generateButton.find('i')
                generateButtonIcon.addClass("fa-save")
                generateButtonIcon.removeClass("fa-cog fa-spin")
                generateButton.removeClass("disabled")
                generateButton.attr("disabled", false)
            } else {
                saveDataToFile(content, "application/zip", `${moduleId}.zip`)
                formApplication.close({force: true}).then()
            }
            ui.notifications.info(game.i18n.localize("compendium2module.info.moduleFinished"))
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
            path = compendiumEntry.img
            if (!imagePaths.includes(path)) {
                imagePaths.push(path)
            }
            if (compendiumEntry.type === "character") {
                path = compendiumEntry.prototypeToken.texture.src
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
        images           = includeImages ? Compendium2Module.collectImagePathsFromCompendium(documents, images) : images
        let documentData = []
        documents.forEach(d => {
            let json = d.toJSON()
            if (includeImages) {
                try {
                    new URL(json.img)
                } catch (e) {
                    json.img = `modules/${moduleId}/assets/${json.img}`
                }
                if (json.type === "character") {
                    try {
                        new URL(json.img)
                    } catch (e) {
                        json.prototypeToken.texture.src = `modules/${moduleId}/assets/${json.prototypeToken.texture.src}`
                    }
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
     * @param {CompendiumCollection[]} compendiums
     * @param {boolean} isSingleCompendium
     * @param {Object} overrideData
     * @param {FormApplication} formApplication
     * @returns {Promise<void>}
     */
    static async generateRequiredFilesForCompendium(compendiums, isSingleCompendium, overrideData, formApplication) {
        let now = Date.now().toString()

        let moduleOptions = {
            "id"           : overrideData.id.length > 0 ? overrideData.id : game.i18n.localize("compendium2module.data.generatedId").replace("<timestamp>", now),
            "authors"      : [{
                "name" : overrideData.author.length > 0 ? overrideData.author : game.user.name,
                "email": "",
                "url"  : ""
            }],
            "version"      : overrideData.version.length > 0 ? overrideData.version : "1.0.0",
            "displayName"  : overrideData.displayName.length > 0 ? overrideData.displayName : (isSingleCompendium ? compendiums[0].metadata.label : `Generated Module #${now}`),
            "includeImages": overrideData.includeImages,
            "saveToFile"   : overrideData.saveToFile
        }

        let manifestURL, downloadURL

        if (moduleOptions.saveToFile) {
            manifestURL = (new URL(`${window.location.origin}/compendium2module/${moduleOptions.id}/module.json`)).href
            downloadURL = (new URL(`${window.location.origin}/compendium2module/${moduleOptions.id}/module-zip.txt`)).href
        } else {
            manifestURL = ""
            downloadURL = ""
        }

        let packs  = []
        let dbData = {
            "images": [],
            "data"  : {}
        }
        let metadata
        let documents
        let images = []
        let transformedData
        let packName

        for (let compendium of compendiums) {
            metadata = compendium.metadata
            if (isSingleCompendium || overrideData[`compendium|${metadata.packageName}|${metadata.name}`] === true) {
                packName = `${metadata.packageName}-${metadata.name}-${now}`

                packs.push({
                    "type"  : metadata.type,
                    "label" : metadata.label,
                    "module": moduleOptions.id,
                    "path"  : `packs/${packName}.db`,
                    "name"  : `${packName}`,
                    "system": game.system.id
                })

                documents             = await compendium.getDocuments()
                transformedData       = Compendium2Module.transformCompendiumData(documents, moduleOptions.id, moduleOptions.includeImages, images)
                images                = transformedData.images
                dbData.data[packName] = transformedData.data
            }
        }

        let moduleJSON = {
            "name"               : moduleOptions.id,
            "title"              : moduleOptions.displayName,
            "description"        : game.i18n.localize("compendium2module.json.description").replace("<displayName>", moduleOptions.displayName),
            "version"            : moduleOptions.version,
            "library"            : "false",
            "manifestPlusVersion": moduleOptions.version,
            "compatibility"      : {
                "minimum" : 10,
                "verified": parseInt(game.version),
                "maximum" : parseInt(game.version) + 1
            },
            "authors"            : moduleOptions.authors,
            "packs"              : packs,
            "manifest"           : manifestURL,
            "download"           : downloadURL
        }

        dbData.images = images

        ui.notifications.info(game.i18n.localize("compendium2module.info.dataCollected"))

        // noinspection JSCheckFunctionSignatures
        return Compendium2Module.generateZIP(moduleOptions.id, JSON.stringify(moduleJSON, null, 4), dbData, formApplication, moduleOptions.saveToFile)
    }

    /**
     * @param {Event} event
     */
    static async copyToClipboard(event) {
        let linkElement = $(event.target).parent().find("input#manifestLink")
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(linkElement.val())
            ui.notifications.info("Copied to clipboard!")
        } else {
            linkElement.focus()
            linkElement.select()
            try {
                // noinspection JSDeprecatedSymbols
                let success = document.execCommand("copy")
                if (success) {
                    ui.notifications.info("Copied to clipboard!")
                } else {
                    ui.notifications.error("Failed to copy to clipboard!")
                }
            } catch (e) {
                console.error(e)
                ui.notifications.error("Failed to copy to clipboard!")
            }
        }
    }
}