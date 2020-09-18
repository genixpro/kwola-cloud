import Checkbox from '../../components/uielements/checkbox';
import React, { Component } from 'react';
import { FullColumn , HalfColumn, OneThirdColumn, TwoThirdColumn, OneFourthColumn, Row, Column} from '../../components/utility/rowColumn';
import {connect, Provider} from 'react-redux';
import {
    FormGroup,
    FormControlLabel,
} from '../../components/uielements/form';
import Papersheet from "../../components/utility/papersheet";



class ErrorsConfiguration extends Component
{
    state = {
        enable5xxError: true,
        enable400Error: true,
        enable401Error: false,
        enable403Error: false,
        enable404Error: true,
        enableJavascriptConsoleError: true,
        enableUnhandledExceptionError: true,
        browserFreezingError: true
    }

    componentDidMount()
    {
        if (this.props.defaultRunConfiguration)
        {
            const config = this.props.defaultRunConfiguration;
            this.setState({
                enable5xxError: config.enable5xxError,
                enable400Error: config.enable400Error,
                enable401Error: config.enable401Error,
                enable403Error: config.enable403Error,
                enable404Error: config.enable404Error,
                enableJavascriptConsoleError: config.enableJavascriptConsoleError,
                enableUnhandledExceptionError: config.enableUnhandledExceptionError,
                // browserFreezingError: config.browserFreezingError
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
            enable5xxError: this.state.enable5xxError,
            enable400Error: this.state.enable400Error,
            enable401Error: this.state.enable401Error,
            enable403Error: this.state.enable403Error,
            enable404Error: this.state.enable404Error,
            enableJavascriptConsoleError: this.state.enableJavascriptConsoleError,
            enableUnhandledExceptionError: this.state.enableUnhandledExceptionError,
            // browserFreezingError: this.state.browserFreezingError
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


    render() {
        return <Papersheet
                title={`Errors`}
                subtitle={``}
            >
            <Row>
                <Column xs={this.props.hideHelp ? 12 : 9}>
                    <FormGroup>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enable5xxError}
                                    onChange={() => this.toggle('enable5xxError')}
                                    value="enable5xxError"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label="Treat HTTP 5xx responses as errors?"
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enable400Error}
                                    onChange={() => this.toggle('enable400Error')}
                                    value="enable400Error"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label="Treat HTTP 400 as an error?"
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enable401Error}
                                    onChange={() => this.toggle('enable401Error')}
                                    value="enable401Error"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label="Treat HTTP 401 as an error?"
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enable403Error}
                                    onChange={() => this.toggle('enable403Error')}
                                    value="enable403Error"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label="Treat HTTP 403 as an error?"
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enable404Error}
                                    onChange={() => this.toggle('enable404Error')}
                                    value="enable404Error"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label="Treat HTTP 404 as an error?"
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enableJavascriptConsoleError}
                                    onChange={() => this.toggle('enableJavascriptConsoleError')}
                                    value="enableJavascriptConsoleError"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label="Treat Javascript console messages (severe and higher) as errors?"
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enableUnhandledExceptionError}
                                    onChange={() => this.toggle('enableUnhandledExceptionError')}
                                    value="enableUnhandledExceptionError"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label="Treat unhandled Javascript exceptions as errors?"
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                        />
                        <br/>
                        {/*<FormControlLabel*/}
                        {/*    control={*/}
                        {/*        <Checkbox*/}
                        {/*            checked={this.state.browserFreezingError}*/}
                        {/*            onChange={() => this.toggle('browserFreezingError')}*/}
                        {/*            value="browserFreezingError"*/}
                        {/*            style={{"cursor": this.props.disabled ? "default" : "pointer"}}*/}
                        {/*        />*/}
                        {/*    }*/}
                        {/*    label="Treat browser freezing (greater then 1 second) as an error?"*/}
                        {/*    style={{"cursor": this.props.disabled ? "default" : "pointer"}}*/}
                        {/*/>*/}
                        {/*<br/>*/}
                    </FormGroup>
                </Column>
                {
                    !this.props.hideHelp ?
                        <Column xs={3}>
                            <p>Select what types of errors you would like Kwola to handle?</p>
                        </Column> : null
                }
            </Row>
        </Papersheet>;
    }
}



const mapStateToProps = (state) => {return { ...state.ErrorsConfiguration} };
export default connect(mapStateToProps)(ErrorsConfiguration);

