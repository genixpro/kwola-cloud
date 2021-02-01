import Checkbox from '../../components/uielements/checkbox';
import DeleteIcon from '@material-ui/icons/Delete';
import React, { Component } from 'react';
import TextField from '../../components/uielements/textfield';
import { Button } from "../UiElements/Button/button.style";
import { FullColumn , HalfColumn, OneThirdColumn, TwoThirdColumn, OneFourthColumn, Row, Column} from '../../components/utility/rowColumn';
import {connect, Provider} from 'react-redux';
import {
    FormGroup,
    FormControlLabel,
} from '../../components/uielements/form';
import Papersheet from "../../components/utility/papersheet";
import AddIcon from '@material-ui/icons/Add';
import {FormControl, InputLabel} from "@material-ui/core";
import {Select} from "../UiElements/Select/select.style";
import Input from "../../components/uielements/input";
import {MenuItem} from "../../components/uielements/menus";
import "./ActionsConfiguration.scss";
import _ from "underscore";
import axios from "axios";

export class TypingActionEditor extends Component
{
    state = {

    }

    static typingActionTypes = [
        {
            "type": "none",
            "title": "No Type",
            "biasKeywords": "",
            "defaultText": "",
            "allowRandom": false,
            "defaultOptions": {}
        },
        {
            "type": "email",
            "title": "Email",
            "biasKeywords": "mail email user",
            "defaultText": "testing-1000@kwola.io",
            "allowRandom": true,
            "defaultOptions": {}
        },
        {
            "type": "address",
            "title": "Street Address",
            "biasKeywords": "addr street",
            "defaultText": "123 Main Street",
            "allowRandom": true,
            "defaultOptions": {
                includeCity: false,
                includeCountry: false,
                includePostalCode: false
            }
        },
        {
            "type": "city",
            "title": "City",
            "biasKeywords": "city",
            "defaultText": "Toronto",
            "allowRandom": true,
            "defaultOptions": {}
        },
        {
            "type": "country",
            "title": "Country",
            "biasKeywords": "country state",
            "defaultText": "Canada",
            "allowRandom": true,
            "defaultOptions": {}
        },
        {
            "type": "postalcode",
            "title": "Postal Code",
            "biasKeywords": "post zip code",
            "defaultText": "90210",
            "allowRandom": true,
            "defaultOptions": {
                "canadianStylePostalCode": true,
                "ukStylePostalCode": true,
                "sixDigitZipCode": true,
                "fiveDigitZipCode": true,
                "fourDigitZipCode": true,
                "nineDigitZipCode": true
            }
        },
        {
            "type": "url",
            "title": "URL",
            "biasKeywords": "url uri ip web",
            "defaultText": "http://testing-1000.kwola.io/",
            "allowRandom": true,
            "defaultOptions": {}
        },
        {
            "type": "creditcard",
            "title": "Credit Card Number",
            "biasKeywords": "card credit",
            "defaultText": "4242 4242 4242 4242",
            "allowRandom": true,
            "defaultOptions": {}
        },
        {
            "type": "creditcardcvc",
            "title": "Credit Card CVC Code",
            "biasKeywords": "cvc cvv",
            "defaultText": "111",
            "allowRandom": true,
            "defaultOptions": {}
        },
        {
            "type": "phonenumber",
            "title": "Phone Number",
            "biasKeywords": "phone cell mobile home work",
            "defaultText": "555-555-1234",
            "allowRandom": true,
            "defaultOptions": {
                "includeExtension": true,
                "includeCountryCode": true
            }
        },
        {
            "type": "date",
            "title": "Date",
            "biasKeywords": "date year month day",
            "defaultText": "2020/06/01",
            "allowRandom": true,
            "defaultOptions": {
                "dateFormat": "%Y-%m-%d"
            }
        },
        {
            "type": "time",
            "title": "Time",
            "biasKeywords": "time",
            "defaultText": "8:00pm",
            "allowRandom": true,
            "defaultOptions": {
                "timeFormat": "%H:%M:%S"
            }
        },
        {
            "type": "number",
            "title": "Number",
            "biasKeywords": "num int float count amount",
            "defaultText": "12345",
            "allowRandom": true,
            "defaultOptions": {
                "numberMinimumValue": -100000,
                "numberMaximumValue": 100000,
                "includeDecimals": false,
                "distributeLogarithmically": true
            }
        },
        {
            "type": "letters",
            "title": "Letters",
            "biasKeywords": "",
            "defaultText": "abcdefghijklmnopqrstuvwxyz",
            "allowRandom": true,
            "defaultOptions": {
                "minimumLength": 4,
                "maximumLength": 20,
                "characterSet": "abcdefghijklmnopqrstuvwxyz"
            }
        }
    ];

    static getTypingActionTypeData(type)
    {
        for(let t of TypingActionEditor.typingActionTypes)
        {
            if (t.type === type)
            {
                return t;
            }
        }
        return null;
    }

    static createDefaultTypingActionForType(type)
    {
        const actionTypeData = TypingActionEditor.getTypingActionTypeData(type);

        const action = {};
        action.type = type;
        action.biasKeywords = actionTypeData.biasKeywords;
        action.text = actionTypeData.defaultText;
        action.generateRandom = actionTypeData.allowRandom;

        Object.keys(actionTypeData.defaultOptions).forEach((key) =>
        {
            action[key] = actionTypeData.defaultOptions[key];
        });

        return action;
    }


    componentDidMount()
    {
        this.setState({action: this.props.action}, () => this.updateGeneratedExamples());
    }


    changeTypingActionGenerateRandom(newValue)
    {
        if (this.props.disabled)
        {
            return;
        }

        const action = this.state.action;
        action.generateRandom = newValue;
        this.setState({action}, () => this.updateParent())
    }

    changeTypingActionText(newValue)
    {
        if (this.props.disabled)
        {
            return;
        }

        const action = this.state.action;
        action.text = newValue;
        this.setState({action}, () => this.updateParent())
    }

    changeTypingActionKeywords(newValue)
    {
        if (this.props.disabled)
        {
            return;
        }

        const action = this.state.action;
        action.biasKeywords = newValue;
        this.setState({action}, () => this.updateParent())
    }

    changeTypingActionType(newValue)
    {
        if (this.props.disabled)
        {
            return;
        }

        const action = this.state.action;

        const defaultValues = TypingActionEditor.createDefaultTypingActionForType(newValue);
        Object.keys(defaultValues).map((key) =>
        {
            action[key] = defaultValues[key];
        });
        this.setState({action}, () => this.updateParent())
    }

    changeTypingActionOption(field, newValue)
    {
        if (this.props.disabled)
        {
            return;
        }

        const action = this.state.action;
        action[field] = newValue;
        this.setState({action}, () => this.updateParent())
    }

    updateParent = _.debounce(() =>
    {
        this.props.onChange(this.state.action);

        // We insert this here just for convenience
        this.updateGeneratedExamples();
    }, 500);


    updateGeneratedExamples()
    {
        if (this.state.action.generateRandom)
        {
            axios.post(`/typing_action_configuration_examples`, _.omit(this.state.action, "index")).then((response) => {
                const examples = response.data.examples;
                this.setState({examples});
            });
        }
    }

    render()
    {
        if (!this.state.action)
        {
            return null;
        }

        return <div className={"typing-action-row"}>
            <FormControl className={"typing-action-type-select-form-control"}>
                <InputLabel id={`typing-action-type-label-${this.props.index}`}>Type</InputLabel>
                <Select
                    value={this.state.action.type}
                    onChange={(evt) => this.changeTypingActionType(evt.target.value)}
                    labelId={`typing-action-type-label-${this.props.index}`}
                    placeholder={"Select a type"}
                    title={"Select a type"}
                    className={"typing-action-bias-select"}
                >
                    {
                        TypingActionEditor.typingActionTypes.map((typingActionType, typingActionTypeIndex) =>
                        {
                            return <MenuItem value={typingActionType.type} key={typingActionType.type}>
                                <span>{typingActionType.title}</span>
                            </MenuItem>;
                        })
                    }
                </Select>
            </FormControl>

            <TextField
                id={`type-action-${this.props.index}-bias-keywords`}
                label={`Keywords - These are used to help Kwola find the input fields to type this text into [OPTIONAL]`}
                type={"text"}
                placeholder={"These are keywords used to identify input elements in the web app which should accept this text."}
                title={"These are keywords used to identify input elements in the web app which should accept this text."}
                value={this.state.action.biasKeywords}
                onChange={(event) => this.changeTypingActionKeywords(event.target.value)}
                margin="normal"
                className={"typing-action-bias-keywords-input"}
            />

            {
                TypingActionEditor.getTypingActionTypeData(this.state.action.type).allowRandom ?
                    <FormGroup row>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    disabled={this.props.disabled}
                                    checked={this.state.action.generateRandom}
                                    onChange={(evt) => this.changeTypingActionGenerateRandom(evt.target.checked)}
                                    value="generateRandomText"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label={`Generate Random ${TypingActionEditor.getTypingActionTypeData(this.state.action.type).title} each time?`}
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                        />
                    </FormGroup> : <div />
            }

            {
                this.state.action.generateRandom ?
                    <div className={"random-generated-text-examples"}>
                        <span><em>Random Examples: </em></span>
                        <span />
                        {
                            this.state.examples ? this.state.examples.map((example) =>
                            {
                                return <span>{example}</span>
                            }) : null
                        }
                    </div> : null
            }

            {
                !this.state.action.generateRandom ?
                    <TextField
                        id={`type-action-text-${this.props.index}`}
                        label={`Text for typing action - This is what Kwola will type in`}
                        type={"text"}
                        value={this.state.action.text}
                        onChange={(event) => this.changeTypingActionText(event.target.value)}
                        margin="normal"
                        className={"typing-action-input"}
                    />: null
            }

            <Button variant="extended"
                    color={"secondary"}
                    className={"delete-typing-action-button"}
                    onClick={() => this.props.onDeleteTypingActionClicked()}>
                <DeleteIcon />
            </Button>

            {
                this.state.action.generateRandom ?
                    <div/> : null
            }

            {
                this.state.action.generateRandom && this.state.action.type === 'number' ?
                    <div className={"random-generated-text-options"}>
                        <TextField
                            id={`type-action-${this.props.index}-number-min-value`}
                            label={`Minimum Value`}
                            type={"number"}
                            placeholder={"This is the smallest possible number that Kwola will type in."}
                            title={"This is the smallest possible number that Kwola will type in."}
                            value={this.state.action.numberMinimumValue}
                            onChange={(event) => this.changeTypingActionOption("numberMinimumValue", event.target.value)}
                            margin="normal"
                            className={"type-action-generated-text-option-input"}
                        />
                        <TextField
                            id={`type-action-${this.props.index}-number-max-value`}
                            label={`Maximum Value`}
                            type={"number"}
                            placeholder={"This is the largest possible number that Kwola will type in."}
                            title={"This is the largest possible number that Kwola will type in."}
                            value={this.state.action.numberMaximumValue}
                            onChange={(event) => this.changeTypingActionOption("numberMaximumValue", event.target.value)}
                            margin="normal"
                            className={"type-action-generated-text-option-input"}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    disabled={this.props.disabled}
                                    checked={this.state.action.includeDecimals}
                                    onChange={(evt) => this.changeTypingActionOption("includeDecimals", evt.target.checked)}
                                    value="includeDecimals"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label={`Include Decimals?`}
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                            className={"type-action-generated-text-option-checkbox"}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    disabled={this.props.disabled}
                                    checked={this.state.action.distributeLogarithmically}
                                    onChange={(evt) => this.changeTypingActionOption("distributeLogarithmically", evt.target.checked)}
                                    value="distributeLogarithmically"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label={`Logarithmic?`}
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                            className={"type-action-generated-text-option-checkbox"}
                        />
                    </div> : null
            }
            {
                this.state.action.generateRandom && this.state.action.type === 'address' ?
                    <div className={"random-generated-text-options"}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    disabled={this.props.disabled}
                                    checked={this.state.action.includeCity}
                                    onChange={(evt) => this.changeTypingActionOption("includeCity", evt.target.checked)}
                                    value="includeCity"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label={`Include City?`}
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                            className={"type-action-generated-text-option-checkbox"}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    disabled={this.props.disabled}
                                    checked={this.state.action.includeCountry}
                                    onChange={(evt) => this.changeTypingActionOption("includeCountry", evt.target.checked)}
                                    value="includeCountry"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label={`Include Country?`}
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                            className={"type-action-generated-text-option-checkbox"}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    disabled={this.props.disabled}
                                    checked={this.state.action.includePostalCode}
                                    onChange={(evt) => this.changeTypingActionOption("includePostalCode", evt.target.checked)}
                                    value="includePostalCode"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label={`Include Postal Code?`}
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                            className={"type-action-generated-text-option-checkbox"}
                        />
                    </div> : null
            }
            {
                this.state.action.generateRandom && this.state.action.type === 'date' ?
                    <div className={"random-generated-text-options-column"}>
                        <TextField
                            id={`type-action-${this.props.index}-date-format`}
                            placeholder={`The format for the random dates that will be generated`}
                            title={`The format for the random dates that will be generated`}
                            label={`Date Format`}
                            type={"text"}
                            value={this.state.action.dateFormat}
                            onChange={(event) => this.changeTypingActionOption("dateFormat", event.target.value)}
                            margin="normal"
                            className={"typing-action-input"}
                        />
                        <a href={"https://docs.python.org/3/library/datetime.html#strftime-strptime-behavior"} target={"_blank"}>Please click here for formatting of the date.</a>
                    </div> : null
            }
            {
                this.state.action.generateRandom && this.state.action.type === 'time' ?
                    <div className={"random-generated-text-options-column"}>
                        <TextField
                            id={`type-action-${this.props.index}-time-format`}
                            label={`Time Format`}
                            placeholder={`The format for the randomly generated times`}
                            title={`The format for the randomly generated times`}
                            type={"text"}
                            value={this.state.action.timeFormat}
                            onChange={(event) => this.changeTypingActionOption("timeFormat", event.target.value)}
                            margin="normal"
                            className={"typing-action-input"}
                        />
                        <a href={"https://docs.python.org/3/library/datetime.html#strftime-strptime-behavior"} target={"_blank"}>Please click here for formatting of the time.</a>
                    </div> : null
            }
            {
                this.state.action.generateRandom && this.state.action.type === 'phonenumber' ?
                    <div className={"random-generated-text-options"}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    disabled={this.props.disabled}
                                    checked={this.state.action.includeExtension}
                                    onChange={(evt) => this.changeTypingActionOption("includeExtension", evt.target.checked)}
                                    value="includeExtension"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label={`Include Line Extension?`}
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                            className={"type-action-generated-text-option-checkbox"}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    disabled={this.props.disabled}
                                    checked={this.state.action.includeCountryCode}
                                    onChange={(evt) => this.changeTypingActionOption("includeCountryCode", evt.target.checked)}
                                    value="includeCountryCode"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label={`Include Country Code?`}
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                            className={"type-action-generated-text-option-checkbox"}
                        />
                    </div> : null
            }
            {
                this.state.action.generateRandom && this.state.action.type === 'postalcode' ?
                    <div className={"random-generated-text-options"}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    disabled={this.props.disabled}
                                    checked={this.state.action.canadianStylePostalCode}
                                    onChange={(evt) => this.changeTypingActionOption("canadianStylePostalCode", evt.target.checked)}
                                    value="canadianStylePostalCode"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label={`Include Canadian style Postal Codes?`}
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                            className={"type-action-generated-text-option-checkbox"}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    disabled={this.props.disabled}
                                    checked={this.state.action.ukStylePostalCode}
                                    onChange={(evt) => this.changeTypingActionOption("ukStylePostalCode", evt.target.checked)}
                                    value="ukStylePostalCode"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label={`Include UK style Postcodes?`}
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                            className={"type-action-generated-text-option-checkbox"}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    disabled={this.props.disabled}
                                    checked={this.state.action.sixDigitZipCode}
                                    onChange={(evt) => this.changeTypingActionOption("sixDigitZipCode", evt.target.checked)}
                                    value="sixDigitZipCode"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label={`Include Six-digit Zip Codes?`}
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                            className={"type-action-generated-text-option-checkbox"}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    disabled={this.props.disabled}
                                    checked={this.state.action.sixDigitZipCode}
                                    onChange={(evt) => this.changeTypingActionOption("sixDigitZipCode", evt.target.checked)}
                                    value="sixDigitZipCode"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label={`Include Six-digit Zip Codes?`}
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                            className={"type-action-generated-text-option-checkbox"}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    disabled={this.props.disabled}
                                    checked={this.state.action.fiveDigitZipCode}
                                    onChange={(evt) => this.changeTypingActionOption("fiveDigitZipCode", evt.target.checked)}
                                    value="fiveDigitZipCode"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label={`Include Five-digit Zip Codes?`}
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                            className={"type-action-generated-text-option-checkbox"}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    disabled={this.props.disabled}
                                    checked={this.state.action.fourDigitZipCode}
                                    onChange={(evt) => this.changeTypingActionOption("fourDigitZipCode", evt.target.checked)}
                                    value="fourDigitZipCode"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label={`Include Four-digit Zip Codes?`}
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                            className={"type-action-generated-text-option-checkbox"}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    disabled={this.props.disabled}
                                    checked={this.state.action.nineDigitZipCode}
                                    onChange={(evt) => this.changeTypingActionOption("nineDigitZipCode", evt.target.checked)}
                                    value="nineDigitZipCode"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label={`Include Nine-digit Zip Codes?`}
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                            className={"type-action-generated-text-option-checkbox"}
                        />
                    </div> : null
            }
            {
                this.state.action.generateRandom && this.state.action.type === 'letters' ?
                    <div className={"random-generated-text-options"}>
                        <TextField
                            id={`type-action-${this.props.index}-letters-min-length`}
                            label={`Minimum Length`}
                            type={"number"}
                            min={1}
                            placeholder={"Shortest length for a randomly generated string"}
                            title={"Shortest length for a randomly generated string"}
                            value={this.state.action.minimumLength}
                            onChange={(event) => this.changeTypingActionOption("minimumLength", event.target.value)}
                            margin="normal"
                            className={"type-action-generated-text-option-input"}
                        />
                        <TextField
                            id={`type-action-${this.props.index}-letters-max-length`}
                            label={`Maximum Length`}
                            type={"number"}
                            min={1}
                            placeholder={"Longest length for a randomly generated string"}
                            title={"Longest length for a randomly generated string"}
                            value={this.state.action.maximumLength}
                            onChange={(event) => this.changeTypingActionOption("maximumLength", event.target.value)}
                            margin="normal"
                            className={"type-action-generated-text-option-input"}
                        />
                        <TextField
                            id={`type-action-${this.props.index}-letters-character-set`}
                            placeholder={`These are all the characters that will be used in the randomly generated strings`}
                            title={`These are all the characters that will be used in the randomly generated strings`}
                            label={"Character Set"}
                            type={"text"}
                            value={this.state.action.characterSet}
                            onChange={(event) => this.changeTypingActionOption("characterSet", event.target.value)}
                            margin="normal"
                            className={"typing-action-input"}
                        />
                    </div> : null
            }
        </div>;
    }
}


class ActionsConfiguration extends Component {
    state = {
        enableDoubleClickCommand: false,
        enableRightClickCommand: false,
        enableScrolling: true,
        enableDragging: false,
        typingActions: []
    }

    componentDidMount()
    {
        this.typingActionCounter = 0;

        if (this.props.defaultRunConfiguration)
        {
            const config = this.props.defaultRunConfiguration;
            this.typingActionCounter = config.typingActions.length;
            this.setState({
                enableDoubleClickCommand: config.enableDoubleClickCommand,
                enableRightClickCommand: config.enableRightClickCommand,
                enableScrolling: config.enableScrolling,
                enableDragging: config.enableDragging,
                typingActions: config.typingActions.map((actionData, actionDataIndex) =>
                {
                    actionData.index = actionDataIndex;
                    return actionData;
                })
            });
        }

    }

    updateParent()
    {
        if (!this.props.onChange)
        {
            return null;
        }

        this.props.onChange({
            enableDoubleClickCommand: this.state.enableDoubleClickCommand,
            enableRightClickCommand: this.state.enableRightClickCommand,
            enableScrolling: this.state.enableScrolling,
            enableDragging: this.state.enableDragging,
            typingActions: this.state.typingActions.map((actionData) =>
            {
                return _.omit(actionData, "index");
            })
        })
    }


    toggle(key)
    {
        if (this.props.disabled)
        {
            return;
        }

        this.setState({[key]: !this.state[key]}, () => this.updateParent())
    }


    addNewTypingAction()
    {
        if (this.props.disabled)
        {
            return;
        }

        const typingActions = this.state.typingActions;

        typingActions.push({
            "type": "none",
            "generateRandom": false,
            "text": "",
            "biasKeywords": "",
            "index": this.typingActionCounter
        })

        this.typingActionCounter += 1;

        this.setState({typingActions}, () => this.updateParent())
    }

    updateTypingAction(index, newData)
    {
        if (this.props.disabled)
        {
            return;
        }

        const typingActions = this.state.typingActions;
        const action = typingActions[index];
        Object.keys(newData).map((key) =>
        {
            action[key] = newData[key];
        });

        this.setState({typingActions}, () => this.updateParent())
    }

    removeTypingAction(index)
    {
        if (this.props.disabled)
        {
            return;
        }

        const typingActions = this.state.typingActions;
        typingActions.splice(index, 1)
        this.setState({typingActions}, () => this.updateParent())
    }


    render() {
        const body = <Row>
                <Column xs={this.props.hideHelp ? 12 : 9}>
                    <FormGroup>
                        <h4>Click Actions</h4>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={true}
                                    disabled={true}
                                    value="enableClick"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label="Enable click action (mandatory)?"
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enableDoubleClickCommand}
                                    onChange={() => this.toggle('enableDoubleClickCommand')}
                                    value="enableDoubleClickCommand"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label="Enable double click action?"
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enableRightClickCommand}
                                    onChange={() => this.toggle('enableRightClickCommand')}
                                    value="enableRightClickCommand"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label="Enable right click action?"
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                        />
                        <br/>
                        <h4>Miscellaneous Actions</h4>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enableScrolling}
                                    onChange={() => this.toggle('enableScrolling')}
                                    value="enableScrolling"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label="Enable scrolling?"
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                        />
                        <br/>
                        <h4>Typing Actions</h4>
                        {
                            this.state.typingActions.map((typingActionData, typingActionIndex) =>
                            {
                                return <TypingActionEditor
                                    disabled={this.props.disabled}
                                    key={typingActionData.index}
                                    index={typingActionData.index}
                                    action={typingActionData}
                                    onChange={(newActionData) => this.updateTypingAction(typingActionIndex, newActionData)}
                                    onDeleteTypingActionClicked={() => this.removeTypingAction(typingActionIndex)}
                                />;
                            })
                        }
                        {
                            <Button variant="extended" color={"primary"} onClick={() => this.addNewTypingAction()}
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}>
                                Add a New Typing Action
                                <AddIcon className="rightIcon"/>
                            </Button>
                        }
                    </FormGroup>

                </Column>
                {
                    !this.props.hideHelp ?
                        <Column xs={3}>
                            <p>Select which of the default, built-in actions you would like to enable.</p>
                        </Column> : null
                }
            </Row>;

        if (this.props.hideWrapper)
        {
            return body;
        }
        else
        {
            return <Papersheet
                title={`Actions`}
                subtitle={``}
            >
                {body}
            </Papersheet>;
        }
    }
}

const mapStateToProps = (state) => {return { ...state.ActionsConfiguration} };
export default connect(mapStateToProps)(ActionsConfiguration);

