import Checkbox from '../../components/uielements/checkbox';
import React, { Component } from 'react';
import TextField from '../../components/uielements/textfield';
import { FullColumn , HalfColumn, OneThirdColumn, TwoThirdColumn, OneFourthColumn, Row, Column} from '../../components/utility/rowColumn';
import {connect, Provider} from 'react-redux';
import {
    FormGroup,
    FormControlLabel,
} from '../../components/uielements/form';


class AutologinCredentials extends Component {
    state = {
        autologin: false,
        email: "",
        password: ""
    }

    updateParent()
    {
        this.props.onChange({
            autologin: this.state.autologin,
            email: this.state.email,
            password: this.state.password
        })
    }

    componentDidMount() {

    }

    toggleEnableAutologin()
    {
        this.setState({autologin: !this.state.autologin}, () => this.updateParent());
    }


    emailChanged(newValue)
    {
        this.setState({email: newValue}, () => this.updateParent());
    }


    passwordChanged(newValue)
    {
        this.setState({password: newValue}, () => this.updateParent());
    }

    render() {
        return <div>
            <Row>
                <Column xs={12}  md={12} lg={9}>
                    <FormGroup row>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={this.state.autologin}
                                    onChange={() => this.toggleEnableAutologin()}
                                    value="autologin"
                                />
                            }
                            label="Enable Heuristic Auto Login?"
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
                                type={"text"}
                                value={this.state.password}
                                onChange={(event) => this.passwordChanged(event.target.value)}
                                margin="normal"
                            /> : null
                    }
                </Column>
                <Column xs={12}  md={12} lg={3}>
                    <p>Select whether you want Kwola to attempt an automatic login as soon as it lands on your application URL.</p>
                </Column>
            </Row>
        </div>;
    }
}

const mapStateToProps = (state) => {return { ...state.AutologinCredentials} };
export default connect(mapStateToProps)(AutologinCredentials);

