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

class ActionsConfiguration extends Component {
    state = {
        enableDoubleClickCommand: false,
        enableRightClickCommand: false,
        enableRandomBracketCommand: true,
        enableRandomMathCommand: false,
        enableRandomOtherSymbolCommand: false,
        enableRandomNumberCommand: true,
        enableScrolling: true,
        enableDragging: false,
        enableTypeEmail: true,
        enableTypePassword: true,
        enableRandomLettersCommand: true,
        enableRandomAddressCommand: true,
        enableRandomEmailCommand: true,
        enableRandomPhoneNumberCommand: true,
        enableRandomParagraphCommand: true,
        enableRandomDateTimeCommand: true,
        enableRandomCreditCardCommand: true,
        enableRandomURLCommand: false,
        customTypingActionStrings: []
    }

    componentDidMount()
    {
        if (this.props.defaultRunConfiguration)
        {
            const config = this.props.defaultRunConfiguration;
            this.setState({
                enableDoubleClickCommand: config.enableDoubleClickCommand,
                enableRightClickCommand: config.enableRightClickCommand,
                enableRandomBracketCommand: config.enableRandomBracketCommand,
                enableRandomMathCommand: config.enableRandomMathCommand,
                enableRandomOtherSymbolCommand: config.enableRandomOtherSymbolCommand,
                enableRandomNumberCommand: config.enableRandomNumberCommand,
                enableScrolling: config.enableScrolling,
                enableDragging: config.enableDragging,
                enableTypeEmail: config.enableTypeEmail,
                enableTypePassword: config.enableTypePassword,
                enableRandomLettersCommand: config.enableRandomLettersCommand,
                enableRandomAddressCommand: config.enableRandomAddressCommand,
                enableRandomEmailCommand: config.enableRandomEmailCommand,
                enableRandomPhoneNumberCommand: config.enableRandomPhoneNumberCommand,
                enableRandomParagraphCommand: config.enableRandomParagraphCommand,
                enableRandomDateTimeCommand: config.enableRandomDateTimeCommand,
                enableRandomCreditCardCommand: config.enableRandomCreditCardCommand,
                enableRandomURLCommand: config.enableRandomURLCommand,
                customTypingActionStrings: config.customTypingActionStrings || []
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
            enableRandomBracketCommand: this.state.enableRandomBracketCommand,
            enableRandomMathCommand: this.state.enableRandomMathCommand,
            enableRandomOtherSymbolCommand: this.state.enableRandomOtherSymbolCommand,
            enableRandomNumberCommand: this.state.enableRandomNumberCommand,
            enableScrolling: this.state.enableScrolling,
            enableDragging: this.state.enableDragging,
            enableTypeEmail: this.state.enableTypeEmail,
            enableTypePassword: this.state.enableTypePassword,
            customTypingActionStrings: this.state.customTypingActionStrings,
            enableRandomLettersCommand: this.state.enableRandomLettersCommand,
            enableRandomAddressCommand: this.state.enableRandomAddressCommand,
            enableRandomEmailCommand: this.state.enableRandomEmailCommand,
            enableRandomPhoneNumberCommand: this.state.enableRandomPhoneNumberCommand,
            enableRandomParagraphCommand: this.state.enableRandomParagraphCommand,
            enableRandomDateTimeCommand: this.state.enableRandomDateTimeCommand,
            enableRandomCreditCardCommand: this.state.enableRandomCreditCardCommand,
            enableRandomURLCommand: this.state.enableRandomURLCommand
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


    addNewCustomString()
    {
        if (this.props.disabled)
        {
            return;
        }

        const customTypingActionStrings = this.state.customTypingActionStrings;

        customTypingActionStrings.push("")

        this.setState({customTypingActionStrings}, () => this.updateParent())
    }

    changeCustomString(index, newValue)
    {
        if (this.props.disabled)
        {
            return;
        }

        const customTypingActionStrings = this.state.customTypingActionStrings;

        customTypingActionStrings[index] = newValue;

        this.setState({customTypingActionStrings}, () => this.updateParent())
    }

    removeCustomString(index)
    {
        if (this.props.disabled)
        {
            return;
        }

        const customTypingActionStrings = this.state.customTypingActionStrings;

        customTypingActionStrings.splice(index, 1)

        this.setState({customTypingActionStrings}, () => this.updateParent())
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
                        <h4>Typing Actions</h4>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enableRandomLettersCommand}
                                    onChange={() => this.toggle('enableRandomLettersCommand')}
                                    value="enableRandomLettersCommand"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label="Enable type random letters?"
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enableRandomAddressCommand}
                                    onChange={() => this.toggle('enableRandomAddressCommand')}
                                    value="enableRandomAddressCommand"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label="Enable type random address?"
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enableRandomEmailCommand}
                                    onChange={() => this.toggle('enableRandomEmailCommand')}
                                    value="enableRandomEmailCommand"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label="Enable type random email?"
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enableRandomPhoneNumberCommand}
                                    onChange={() => this.toggle('enableRandomPhoneNumberCommand')}
                                    value="enableRandomPhoneNumberCommand"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label="Enable type random phone number?"
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enableRandomParagraphCommand}
                                    onChange={() => this.toggle('enableRandomParagraphCommand')}
                                    value="enableRandomParagraphCommand"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label="Enable type random paragraph?"
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enableRandomDateTimeCommand}
                                    onChange={() => this.toggle('enableRandomDateTimeCommand')}
                                    value="enableRandomDateTimeCommand"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label="Enable type random date time?"
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enableRandomCreditCardCommand}
                                    onChange={() => this.toggle('enableRandomCreditCardCommand')}
                                    value="enableRandomCreditCardCommand"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label="Enable type random credit card number?"
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enableRandomURLCommand}
                                    onChange={() => this.toggle('enableRandomURLCommand')}
                                    value="enableRandomURLCommand"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label="Enable type random url?"
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                        />
                        <br/>
                        {/*<FormControlLabel*/}
                        {/*    control={*/}
                        {/*        <Checkbox*/}
                        {/*            checked={this.state.enableDragging}*/}
                        {/*            onChange={() => this.toggle('enableDragging')}*/}
                        {/*            value="enableDragging"*/}
                        {/*            style={{"cursor": this.props.disabled ? "default" : "pointer"}}*/}
                        {/*        />*/}
                        {/*    }*/}
                        {/*    label="Enable drag action?"*/}
                        {/*    style={{"cursor": this.props.disabled ? "default" : "pointer"}}*/}
                        {/*/>*/}
                        {/*<br/>*/}
                        {/*<FormControlLabel*/}
                        {/*    control={*/}
                        {/*        <Checkbox*/}
                        {/*            checked={this.state.enableTypeEmail}*/}
                        {/*            onChange={() => this.toggle('enableTypeEmail')}*/}
                        {/*            value="enableTypeEmail"*/}
                        {/*            style={{"cursor": this.props.disabled ? "default" : "pointer"}}*/}
                        {/*        />*/}
                        {/*    }*/}
                        {/*    label="Enable type email action?"*/}
                        {/*    style={{"cursor": this.props.disabled ? "default" : "pointer"}}*/}
                        {/*/>*/}
                        {/*<br/>*/}
                        {/*<FormControlLabel*/}
                        {/*    control={*/}
                        {/*        <Checkbox*/}
                        {/*            checked={this.state.enableTypePassword}*/}
                        {/*            onChange={() => this.toggle('enableTypePassword')}*/}
                        {/*            value="enableTypePassword"*/}
                        {/*            style={{"cursor": this.props.disabled ? "default" : "pointer"}}*/}
                        {/*        />*/}
                        {/*    }*/}
                        {/*    label="Enable type password action?"*/}
                        {/*    style={{"cursor": this.props.disabled ? "default" : "pointer"}}*/}
                        {/*/>*/}
                        {/*<br/>*/}
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enableRandomBracketCommand}
                                    onChange={() => this.toggle('enableRandomBracketCommand')}
                                    value="enableRandomBracketCommand"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label="Enable type random brackets action?"
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enableRandomMathCommand}
                                    onChange={() => this.toggle('enableRandomMathCommand')}
                                    value="enableRandomMathCommand"
                                />
                            }
                            label="Enable type random math symbols action?"
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enableRandomOtherSymbolCommand}
                                    onChange={() => this.toggle('enableRandomOtherSymbolCommand')}
                                    value="enableRandomOtherSymbolCommand"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label="Enable type random other symbols action?"
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enableRandomNumberCommand}
                                    onChange={() => this.toggle('enableRandomNumberCommand')}
                                    value="enableRandomNumberCommand"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label="Enable type random numbers action?"
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                        />
                        <br/>
                    </FormGroup>
                    <br/>
                    <br/>

                    {
                        <Button variant="extended" color={"primary"} onClick={() => this.addNewCustomString()}
                                style={{"cursor": this.props.disabled ? "default" : "pointer"}}>
                            Add a Custom Typing Action
                            <AddIcon className="rightIcon" />
                        </Button>
                    }

                    {
                        this.state.customTypingActionStrings.map((typeActionString, typeActionIndex) =>
                        {
                            return <div key={typeActionIndex}>
                                <TextField
                                    id={`type-action-${typeActionIndex}`}
                                    label={`Typing Action ${typeActionIndex + 1}`}
                                    type={"text"}
                                    value={typeActionString}
                                    onChange={(event) => this.changeCustomString(typeActionIndex, event.target.value)}
                                    margin="normal"
                                    style={{"width": "70%"}}
                                />

                                <Button variant="extended" color={"secondary"} onClick={() => this.removeCustomString(typeActionIndex)}>
                                    <DeleteIcon />
                                </Button>
                            </div>;
                        })
                    }
                    <br/>
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
                    <br/>
                    <br/>

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

