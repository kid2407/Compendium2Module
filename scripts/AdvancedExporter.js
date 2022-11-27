import {Compendium2Module} from "./Compendium2Module.js"

export class AdvancedExporter extends FormApplication {
    async _updateObject(event, formData) {
        event.preventDefault()
        if (Compendium2Module.validateFields(formData)) {
            let button = $(".compendium2moduleDialog").find(".buttons > button[type='submit']")
            let icon = button.find("> i")
            icon.removeClass("fa-save fa-check")
            icon.addClass("fa-cog fa-spin")
            button.addClass("disabled")
            button.attr("disabled", true)
            return Compendium2Module.generateRequiredFilesForCompendium(game.packs, false, formData, this)
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
            "label":    game.i18n.localize("compendium2module.data.generatedName").replace("<timestamp>", now),
            "user":     game.user.name,
            "version":  "1.0.0",
            "packs":    game.packs.map(p => p.metadata).sort((a, b) => {
                if (a.type !== b.type) {
                    return a.type.localeCompare(b.type)
                }
                if (a.packageName !== b.packageName) {
                    return a.packageName.localeCompare(b.packageName)
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

        html.find("button.copyToClipboard").on("click", async (event) => {
            await Compendium2Module.copyToClipboard(event)
        })
    }
}