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

    componentDidMount() {

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
        this.setState({[key]: !this.state[key]}, () => this.updateParent())
    }


    render() {
        return <div>
            <Row>
                <Column xs={9}>
                    <FormGroup>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enable5xxError}
                                    onChange={() => this.toggle('enable5xxError')}
                                    value="enable5xxError"
                                />
                            }
                            label="Treat HTTP 5xx responses as errors?"
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enable400Error}
                                    onChange={() => this.toggle('enable400Error')}
                                    value="enable400Error"
                                />
                            }
                            label="Treat HTTP 400 as an error?"
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enable401Error}
                                    onChange={() => this.toggle('enable401Error')}
                                    value="enable401Error"
                                />
                            }
                            label="Treat HTTP 401 as an error?"
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enable403Error}
                                    onChange={() => this.toggle('enable403Error')}
                                    value="enable403Error"
                                />
                            }
                            label="Treat HTTP 403 as an error?"
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.enable404Error}
                                    onChange={() => this.toggle('enable404Error')}
                                    value="enable404Error"
                                />
                            }
                            label="Treat HTTP 404 as an error?"
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.javascriptConsoleError}
                                    onChange={() => this.toggle('javascriptConsoleError')}
                                    value="javascriptConsoleError"
                                />
                            }
                            label="Treat Javascript console messages (severe and higher) as errors?"
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.unhandledExceptionError}
                                    onChange={() => this.toggle('unhandledExceptionError')}
                                    value="unhandledExceptionError"
                                />
                            }
                            label="Treat unhandled Javascript exceptions as errors?"
                        />
                        <br/>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.browserFreezingError}
                                    onChange={() => this.toggle('browserFreezingError')}
                                    value="browserFreezingError"
                                />
                            }
                            label="Treat browser freezing (greater then 1 second) as an error?"
                        />
                        <br/>
                    </FormGroup>
                </Column>
                <Column xs={3}>
                    <p>Select what types of errors you would like Kwola to handle?</p>
                </Column>
            </Row>
        </div>;
    }
}



const mapStateToProps = (state) => {return { ...state.ErrorsConfiguration} };
export default connect(mapStateToProps)(ErrorsConfiguration);

