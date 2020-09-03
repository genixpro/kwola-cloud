import Checkbox from '../../components/uielements/checkbox';
import React, { Component } from 'react';
import { FullColumn , HalfColumn, OneThirdColumn, TwoThirdColumn, OneFourthColumn, Row, Column} from '../../components/utility/rowColumn';
import {connect, Provider} from 'react-redux';
import {
    FormGroup,
    FormControlLabel,
} from '../../components/uielements/form';



class ErrorsConfiguration extends Component
{
    state = {
        enable5xxError: true,
        enable400Error: true,
        enable401Error: false,
        enable403Error: false,
        enable404Error: true,
        javascriptConsoleError: true,
        unhandledExceptionError: true,
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
                javascriptConsoleError: config.javascriptConsoleError,
                unhandledExceptionError: config.unhandledExceptionError,
                browserFreezingError: config.browserFreezingError
            });
        }
    }

    updateParent()
    {
        this.props.onChange({
            enable5xxError: this.state.enable5xxError,
            enable400Error: this.state.enable400Error,
            enable401Error: this.state.enable401Error,
            enable403Error: this.state.enable403Error,
            enable404Error: this.state.enable404Error,
            javascriptConsoleError: this.state.javascriptConsoleError,
            unhandledExceptionError: this.state.unhandledExceptionError,
            browserFreezingError: this.state.browserFreezingError
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
        return <div>
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
                                    checked={this.state.javascriptConsoleError}
                                    onChange={() => this.toggle('javascriptConsoleError')}
                                    value="javascriptConsoleError"
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
                                    checked={this.state.unhandledExceptionError}
                                    onChange={() => this.toggle('unhandledExceptionError')}
                                    value="unhandledExceptionError"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label="Treat unhandled Javascript exceptions as errors?"
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.browserFreezingError}
                                    onChange={() => this.toggle('browserFreezingError')}
                                    value="browserFreezingError"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label="Treat browser freezing (greater then 1 second) as an error?"
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                        />
                        <br/>
                    </FormGroup>
                </Column>
                {
                    !this.props.hideHelp ?
                        <Column xs={3}>
                            <p>Select what types of errors you would like Kwola to handle?</p>
                        </Column> : null
                }
            </Row>
        </div>;
    }
}



const mapStateToProps = (state) => {return { ...state.ErrorsConfiguration} };
export default connect(mapStateToProps)(ErrorsConfiguration);

