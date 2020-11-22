import Checkbox from '../../components/uielements/checkbox';
import React, { Component } from 'react';
import TextField from '../../components/uielements/textfield';
import { FullColumn , HalfColumn, OneThirdColumn, TwoThirdColumn, OneFourthColumn, Row, Column} from '../../components/utility/rowColumn';
import {connect, Provider} from 'react-redux';
import {
    FormGroup,
    FormControlLabel,
} from '../../components/uielements/form';
import {Button} from "../UiElements/Button/button.style";
import Papersheet from "../../components/utility/papersheet";


class AutologinCredentials extends Component {
    state = {
        autologin: false,
        email: "",
        password: ""
    }

    updateParent()
    {
        if (!this.props.onChange)
        {
            return null;
        }

        this.props.onChange({
            autologin: this.state.autologin,
            email: this.state.email,
            password: this.state.password
        })
    }

    componentDidMount()
    {
        if (this.props.defaultRunConfiguration)
        {
            const config = this.props.defaultRunConfiguration;
            this.setState({
                autologin: config.autologin,
                email: config.email,
                password: config.password
            });
        }
    }

    toggleEnableAutologin()
    {
        if (this.props.disabled)
        {
            return;
        }

        this.setState({autologin: !this.state.autologin}, () => this.updateParent());
    }


    emailChanged(newValue)
    {
        if (this.props.disabled)
        {
            return;
        }

        this.setState({email: newValue}, () => this.updateParent());
    }


    passwordChanged(newValue)
    {
        if (this.props.disabled)
        {
            return;
        }

        this.setState({password: newValue}, () => this.updateParent());
    }

    render() {
        return <Papersheet
                title={`Credentials`}
                subtitle={``}
            >
            <Row>
                <Column xs={this.props.hideHelp ? 12 : 9}>
                    <FormGroup row>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.autologin}
                                    onChange={() => this.toggleEnableAutologin()}
                                    value="autologin"
                                    style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                                />
                            }
                            label="Enable Heuristic Auto Login?"
                            style={{"cursor": this.props.disabled ? "default" : "pointer"}}
                        />
                    </FormGroup>
                    <br/>
                    {
                        this.state.autologin ?
                            <TextField
                                id="email"
                                label="Email / Username"
                                type={"text"}
                                value={this.state.email}
                                onChange={(event) => this.emailChanged(event.target.value)}
                                margin="normal"
                            /> : null
                    }
                    <br/>
                    {
                        this.state.autologin ?
                            <TextField
                                id="password"
                                label="Password"
                                type={"password"}
                                value={this.state.password}
                                onChange={(event) => this.passwordChanged(event.target.value)}
                                margin="normal"
                            /> : null
                    }
                </Column>
                {
                    !this.props.hideHelp ?
                        <Column xs={3}>
                            <p>Select whether you want Kwola to attempt an automatic login as soon as it lands on your application URL.</p>
                        </Column> : null
                }
            </Row>
        </Papersheet>;
    }
}

const mapStateToProps = (state) => {return { ...state.AutologinCredentials} };
export default connect(mapStateToProps)(AutologinCredentials);

