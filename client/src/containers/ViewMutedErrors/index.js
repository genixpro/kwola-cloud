import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import {connect, Provider} from 'react-redux';
import { createStore, combineReducers } from 'redux';
import { reducer as reduxFormReducer } from 'redux-form';
import LayoutWrapper from '../../components/utility/layoutWrapper';
import Papersheet, { DemoWrapper } from '../../components/utility/papersheet';
import { FullColumn , HalfColumn, OneThirdColumn, TwoThirdColumn, Row, Column} from '../../components/utility/rowColumn';
import axios from "axios";
import 'plyr/dist/plyr.css'
import MutedErrorsTable from "../ViewMutedErrors/mutedErrorsTable";


class ViewMutedErrors extends Component {
    state = {
        result: '',
        loadingVideo:true,
        loader:false,
        mutedErrors: []
    };

    componentDidMount()
    {
        axios.get(`/muted_errors`, {params: {applicationId: this.props.match.params.id}}).then((response) =>
        {
            this.setState({mutedErrors: response.data.mutedErrors})
        });
    }

    onMutedErrorDeleted(index)
    {
        const mutedErrors = this.state.mutedErrors;
        mutedErrors.splice(index, 1);
        this.setState({mutedErrors: mutedErrors});
    }

    render() {
        const { result } = this.state;

        return (
            <LayoutWrapper>
                <FullColumn>
                    <Row>
                        <FullColumn>
                            <Papersheet
                                title={`Muted Errors`}
                                // subtitle={}
                            >

                                <MutedErrorsTable {...this.props} data={this.state.mutedErrors} onMutedErrorDeleted={(index) => this.onMutedErrorDeleted(index)} />
                            </Papersheet>
                        </FullColumn>
                    </Row>
                </FullColumn>
            </LayoutWrapper>
        );
    }
}

const mapStateToProps = (state) => {return { ...state.ViewMutedErrors} };
export default connect(mapStateToProps)(ViewMutedErrors);

