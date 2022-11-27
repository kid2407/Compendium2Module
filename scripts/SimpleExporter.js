import {Compendium2Module} from "./Compendium2Module.js"

export class SimpleExporter extends FormApplication {
    pack = null

    constructor(pack) {
        super()
        this.pack = pack
    }

    async _updateObject(event, formData) {
        let button = $(".compendium2moduleDialog").find(".buttons > button[type='submit']")
        let icon = button.find("> i")
        icon.removeClass("fa-save fa-check")
        icon.addClass("fa-cog fa-spin")
        button.addClass("disabled")
        button.attr("disabled", true)
        return await Compendium2Module.generateRequiredFilesForCompendium([this.pack], true, formData, this)
    }

    get title() {
        return game.i18n.localize("compendium2module.edit.title")
    }

    static get defaultOptions() {
        const options = super.defaultOptions
        options.id = `compendium2module-single-editor`
        options.template = `modules/compendium2module/templates/singleCompendium.hbs`
        options.width = 800
        options.height = "auto"
        options.resizable = true
        options.closeOnSubmit = false

        return options
    }

    // noinspection JSCheckFunctionSignatures
    getData(options = {}) {
        // noinspection JSValidateTypes
        return {
            "internal": this.pack.metadata.name,
            "label":    this.pack.metadata.label,
            "user":     game.user.name,
            "version":  "1.0.0"
        }
    }

    activateListeners(html) {
        super.activateListeners(html)
        let instance = this

        html.find("button#cancel").on("click", async function () {
            await instance.close()
        })

        html.find("button.copyToClipboard").on("click", async (event) => {
            await Compendium2Module.copyToClipboard(event)
        })
    }
}