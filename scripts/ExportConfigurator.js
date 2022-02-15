import {Compendium2Module} from "./Compendium2Module.js"

export class ExportConfigurator extends FormApplication {
    pack = null

    constructor(pack) {
        super()
        this.pack = pack
    }

    async _updateObject(event, formData) {
        return await Compendium2Module.generateRequiredFilesForCompendium(this.pack, formData)
    }

    get title() {
        return game.i18n.localize("compendium2module.edit.title")
    }

    static get defaultOptions() {
        const options = super.defaultOptions
        options.id = `compendium2module-single-editor`
        options.template = `modules/compendium2module/templates/singleCompendium.hbs`
        options.width = 800
        options.height = 600
        options.resizable = true

        return options
    }

    // noinspection JSCheckFunctionSignatures
    getData(options = {}) {
        // noinspection JSValidateTypes
        return {}
    }

    activateListeners(html) {
        return super.activateListeners(html)
        // onSubmit stuff
    }
}