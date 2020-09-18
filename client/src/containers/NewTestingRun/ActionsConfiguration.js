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
        enableRandomBracketCommand: false,
        enableRandomMathCommand: false,
        enableRandomOtherSymbolCommand: false,
        enableRandomNumberCommand: false,
        enableScrolling: false,
        enableDragging: false,
        enableTypeEmail: false,
        enableTypePassword: false,
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
            customTypingActionStrings: this.state.customTypingActionStrings
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
        return <Papersheet
                title={`Actions`}
                subtitle={``}
            >
            <Row>
                <Column xs={this.props.hideHelp ? 12 : 9}>
                    <FormGroup>
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
                        {/*<FormControlLabel*/}
                        {/*    control={*/}
                        {/*        <Checkbox*/}
                        {/*            checked={this.state.enableScrolling}*/}
                        {/*            onChange={() => this.toggle('enableScrolling')}*/}
                        {/*            value="enableScrolling"*/}
                        {/*            style={{"cursor": this.props.disabled ? "default" : "pointer"}}*/}
                        {/*        />*/}
                        {/*    }*/}
                        {/*    label="Enable scrolling actions?"*/}
                        {/*    style={{"cursor": this.props.disabled ? "default" : "pointer"}}*/}
                        {/*/>*/}
                        {/*<br/>*/}
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

                </Column>
                {
                    !this.props.hideHelp ?
                        <Column xs={3}>
                            <p>Select which of the default, built-in actions you would like to enable?</p>
                        </Column> : null
                }
            </Row>
        </Papersheet>;
    }
}

const mapStateToProps = (state) => {return { ...state.ActionsConfiguration} };
export default connect(mapStateToProps)(ActionsConfiguration);

