import {Compendium2Module} from "./Compendium2Module.js"

export class AdvancedExporter extends FormApplication {
    async _updateObject(event, formData) {
        if (Compendium2Module.validateFields(formData)) {
            let button = $(".compendium2moduleDialog").find(".buttons > button[type='submit']")
            let icon = button.find("> i")
            icon.removeClass("fa-save")
            icon.addClass("fa-cog fa-spin")
            button.addClass("disabled")
            button.attr("disabled", true)
            return Compendium2Module.generateRequiredFilesForCompendium(game.packs, formData, this)
        } else {
            event.preventDefault()
        }
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
        options.closeOnSubmit = false

        return options
    }

    // noinspection JSCheckFunctionSignatures
    getData(options = {}) {
        let now = Date.now().toString()
        // noinspection JSValidateTypes
        return {
            "internal": game.i18n.localize("compendium2module.data.generatedId").replace("<timestamp>", now),
            "label"   : game.i18n.localize("compendium2module.data.generatedName").replace("<timestamp>", now),
            "user"    : game.user.name,
            "version" : "1.0.0",
            "packs"   : game.packs.map(p => p.metadata).sort((a, b) => {
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

    activateListeners(html) {
        super.activateListeners(html)
        let checkboxes = $('div.advancedCompendiumEditor table input:checkbox')
        let checkboxCount = checkboxes.length

        html.find("a#toggleAllCompendiums").on("click", async (event) => {
            let table = $(event.target).closest("table")
            checkboxes.prop("checked", table.find("input:checkbox:checked").length !== checkboxCount)
        })
    }
}