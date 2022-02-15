import {Compendium2Module} from "./Compendium2Module.js";

export class AdvancedExporter extends FormApplication {
    async _updateObject(event, formData) {
        let button = $(".compendium2moduleDialog").find(".buttons > button[type='submit']")
        let icon = button.find("> i")
        icon.removeClass("fa-save")
        icon.addClass("fa-cog fa-spin")
        button.addClass("disabled")
        button.attr("disabled", true)
        return await Compendium2Module.generateRequiredFilesForCompendium(game.packs, formData)
    }

    get title() {
        return game.i18n.localize("compendium2module.advanced.title")
    }

    static get defaultOptions() {
        const options = super.defaultOptions
        options.id = `compendium2module-advanced-editor`
        options.template = `modules/compendium2module/templates/advancedCompendium.hbs`
        options.width = 800
        options.height = "auto"
        options.resizable = true

        return options
    }

    // noinspection JSCheckFunctionSignatures
    getData(options = {}) {
        // noinspection JSValidateTypes
        return {
            "internal": `generated-module-${Date.now()}`,
            "label": `Generated Module #${Date.now()}`,
            "user": game.user.name,
            "version": "1.0.0",
            "packs": game.packs.map(p => p.metadata).sort((a, b) => {
                if (a.type !== b.type) {
                    return a.type.localeCompare(b.type)
                }
                if (a.package !== b.package) {
                    return a.package.localeCompare(b.package)
                }

                return a.label.localeCompare(b.label)
            })
        }
    }
}