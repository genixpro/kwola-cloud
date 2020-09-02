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


class ActionsConfiguration extends Component {
    state = {
        enableDoubleClick: false,
        enableRightClick: false,
        enableRandomLetters: false,
        enableRandomBrackets: false,
        enableRandomMathSymbols: false,
        enableRandomOtherSymbols: false,
        enableRandomNumbers: false,
        enableScrolling: false,
        enableDragging: false,
        enableTypeEmail: false,
        enableTypePassword: false,
        customTypeStrings: []
    }

    componentDidMount() {

    }

    updateParent()
    {
        this.props.onChange({
            enableDoubleClick: this.state.enableDoubleClick,
            enableRightClick: this.state.enableRightClick,
            enableRandomLetters: this.state.enableRandomLetters,
            enableRandomBrackets: this.state.enableRandomBrackets,
            enableRandomMathSymbols: this.state.enableRandomMathSymbols,
            enableRandomOtherSymbols: this.state.enableRandomOtherSymbols,
            enableRandomNumbers: this.state.enableRandomNumbers,
            enableScrolling: this.state.enableScrolling,
            enableDragging: this.state.enableDragging,
            enableTypeEmail: this.state.enableTypeEmail,
            enableTypePassword: this.state.enableTypePassword,
            customTypeStrings: this.state.customTypeStrings
        })
    }


    toggle(key)
    {
        this.setState({[key]: !this.state[key]}, () => this.updateParent())
    }


    addNewCustomString()
    {
        const customTypeStrings = this.state.customTypeStrings;

        customTypeStrings.push("")

        this.setState({customTypeStrings}, () => this.updateParent())
    }

    changeCustomString(index, newValue)
    {
        const customTypeStrings = this.state.customTypeStrings;

        customTypeStrings[index] = newValue;

        this.setState({customTypeStrings}, () => this.updateParent())
    }

    removeCustomString(index)
    {
        const customTypeStrings = this.state.customTypeStrings;

        customTypeStrings.splice(index, 1)

        this.setState({customTypeStrings}, () => this.updateParent())
    }


    render() {
        return <div>
            <Row>
                <Column xs={9}>
                    <FormGroup>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={true}
                                    disabled={true}
                                    value="enableClick"
                                />
                            }
                            label="Enable click action (mandatory)?"
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enableDoubleClick}
                                    onChange={() => this.toggle('enableDoubleClick')}
                                    value="enableDoubleClick"
                                />
                            }
                            label="Enable double click action?"
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enableRightClick}
                                    onChange={() => this.toggle('enableRightClick')}
                                    value="enableRightClick"
                                />
                            }
                            label="Enable right click action?"
                        />
                        <br/>
                        {/*<FormControlLabel*/}
                        {/*    control={*/}
                        {/*        <Checkbox*/}
                        {/*            checked={this.state.enableScrolling}*/}
                        {/*            onChange={() => this.toggle('enableScrolling')}*/}
                        {/*            value="enableScrolling"*/}
                        {/*        />*/}
                        {/*    }*/}
                        {/*    label="Enable scrolling actions?"*/}
                        {/*/>*/}
                        {/*<br/>*/}
                        {/*<FormControlLabel*/}
                        {/*    control={*/}
                        {/*        <Checkbox*/}
                        {/*            checked={this.state.enableDragging}*/}
                        {/*            onChange={() => this.toggle('enableDragging')}*/}
                        {/*            value="enableDragging"*/}
                        {/*        />*/}
                        {/*    }*/}
                        {/*    label="Enable drag action?"*/}
                        {/*/>*/}
                        {/*<br/>*/}
                        {/*<FormControlLabel*/}
                        {/*    control={*/}
                        {/*        <Checkbox*/}
                        {/*            checked={this.state.enableTypeEmail}*/}
                        {/*            onChange={() => this.toggle('enableTypeEmail')}*/}
                        {/*            value="enableTypeEmail"*/}
                        {/*        />*/}
                        {/*    }*/}
                        {/*    label="Enable type email action?"*/}
                        {/*/>*/}
                        {/*<br/>*/}
                        {/*<FormControlLabel*/}
                        {/*    control={*/}
                        {/*        <Checkbox*/}
                        {/*            checked={this.state.enableTypePassword}*/}
                        {/*            onChange={() => this.toggle('enableTypePassword')}*/}
                        {/*            value="enableTypePassword"*/}
                        {/*        />*/}
                        {/*    }*/}
                        {/*    label="Enable type password action?"*/}
                        {/*/>*/}
                        {/*<br/>*/}
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enableRandomLetters}
                                    onChange={() => this.toggle('enableRandomLetters')}
                                    value="enableRandomLetters"
                                />
                            }
                            label="Enable type random letters action?"
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enableRandomBrackets}
                                    onChange={() => this.toggle('enableRandomBrackets')}
                                    value="enableRandomBrackets"
                                />
                            }
                            label="Enable type random brackets action?"
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enableRandomMathSymbols}
                                    onChange={() => this.toggle('enableRandomMathSymbols')}
                                    value="enableRandomMathSymbols"
                                />
                            }
                            label="Enable type random math symbols action?"
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enableRandomOtherSymbols}
                                    onChange={() => this.toggle('enableRandomOtherSymbols')}
                                    value="enableRandomOtherSymbols"
                                />
                            }
                            label="Enable type random other symbols action?"
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enableRandomNumbers}
                                    onChange={() => this.toggle('enableRandomNumbers')}
                                    value="enableRandomNumbers"
                                />
                            }
                            label="Enable type random numbers action?"
                        />
                        <br/>
                    </FormGroup>
                    <br/>
                    <br/>
                    <br/>

                    {/*{*/}
                    {/*    <Button variant="extended" color={"primary"} onClick={() => this.addNewCustomString()}>*/}
                    {/*        Add a Custom Typing Action*/}
                    {/*        <AddIcon className="rightIcon"></AddIcon>*/}
                    {/*    </Button>*/}
                    {/*}*/}

                    {
                        this.state.customTypeStrings.map((typeActionString, typeActionIndex) =>
                        {
                            return <div key={typeActionIndex}>
                                <TextField
                                    id={`type-action-${typeActionIndex}`}
                                    label={`Typing Action ${typeActionIndex + 1}`}
                                    type={"text"}
                                    value={typeActionString}
                                    onChange={(event) => this.changeCustomString(typeActionIndex, event.target.value)}
                                    margin="normal"
                                />

                                <Button variant="extended" color={"secondary"} onClick={() => this.removeCustomString(typeActionIndex)}>
                                    <DeleteIcon />
                                </Button>
                            </div>;
                        })
                    }

                </Column>
                <Column xs={3}>
                    <p>Select which of the default, built-in actions you would like to enable?</p>
                </Column>
            </Row>
        </div>;
    }
}

const mapStateToProps = (state) => {return { ...state.ActionsConfiguration} };
export default connect(mapStateToProps)(ActionsConfiguration);

