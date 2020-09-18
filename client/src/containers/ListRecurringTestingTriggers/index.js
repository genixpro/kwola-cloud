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
import AddIcon from '@material-ui/icons/Add';
import {Button} from "../UiElements/Button/button.style";
import RecurringTestingTriggersTable from "./recurringTestingTriggersTable";


class ListRecurringTestingTriggers extends Component {
    state = {
        result: '',
        loadingVideo:true,
        loader:false,
        triggers: []
    };

    componentDidMount()
    {
        axios.get(`/recurring_testing_trigger`, {params: {applicationId: this.props.match.params.id}}).then((response) =>
        {
            this.setState({triggers: response.data.recurringTestingTriggers})
        });
    }

    onTriggerDeleted(index)
    {
        const triggers = this.state.triggers;
        triggers.splice(index, 1);
        this.setState({triggers: triggers});
    }

    addNewTriggerClicked()
    {
        this.props.history.push(`/app/dashboard/applications/${this.props.match.params.id}/new_trigger`)
    }

    render() {
        const { result } = this.state;

        return (
            <LayoutWrapper>
                <FullColumn>
                    <Row>
                        <FullColumn>
                            <Papersheet
                                title={`Recurring Testing for Triggers`}
                                // subtitle={}
                                button={
                                    <div>
                                        <Button variant="contained"
                                                size="small"
                                                color={"primary"}
                                                title={"Add New Trigger"}
                                                onClick={(event) => this.addNewTriggerClicked(event)}
                                        >
                                            <AddIcon />
                                        </Button>
                                    </div>
                                }
                            >

                                <RecurringTestingTriggersTable {...this.props} data={this.state.triggers} onTriggerDeleted={(index) => this.onTriggerDeleted(index)} />
                            </Papersheet>
                        </FullColumn>
                    </Row>
                </FullColumn>
            </LayoutWrapper>
        );
    }
}

const mapStateToProps = (state) => {return { ...state.ListRecurringTestingTriggers} };
export default connect(mapStateToProps)(ListRecurringTestingTriggers);

