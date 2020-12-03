import React, { Component } from 'react';
import Auth0 from '../../../helpers/auth0';
import axios from "axios";


class SelfTestLogin extends Component {
    state = {

    };

    componentDidMount()
    {
        axios.get(`/self_test_login`).then((response) =>
        {
            const data = response.data;

            Auth0.setSession(data);

            this.props.history.push('/app/dashboard/');
        });
    }


    render()
    {
        return null;
    }
}
export default SelfTestLogin;
