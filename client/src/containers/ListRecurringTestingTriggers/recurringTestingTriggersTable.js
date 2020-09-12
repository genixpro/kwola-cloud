import React, { Component } from 'react';
import {connect, Provider} from 'react-redux';
import {Table} from "../ListApplications/materialUiTables.style";
import {TableBody, TableCell, TableHead, TableRow, TablePagination} from "../../components/uielements/table";
import moment from 'moment';
import MaterialTable from 'material-table'
import Button from "../../components/uielements/button";
import VolumeOffIcon from "@material-ui/icons/VolumeOff";
import Icon from "../../components/uielements/icon";
import axios from "axios";

class RecurringTestingTriggersTable extends Component{
    state = {
        newPage:0,
        setPage:0,
        rowsPerPage:10
    };

    handleRowClick(event, rowData)
    {
        this.props.history.push(`/app/dashboard/triggers/${rowData._id}`)
    }


    prepareDataForTable(data)
    {
        let rdata = [];
        if(data)
        {
            data.map((trigger) =>
            {
                trigger.lastTriggerTimeFormatted = trigger.lastTriggerTime ? moment(new Date(trigger.lastTriggerTime.$date)).format('HH:mm MMM Do') : "never"
                rdata.push(trigger)
            });
        }
        return rdata;
    }

    deleteTriggerClicked(evt, trigger)
    {
        let index = 0;
        for (let listTrigger of this.props.data)
        {
            if (listTrigger._id === trigger._id)
            {
                break;
            }
            else
            {
                index += 1;
            }
        }

        axios.delete(`/recurring_testing_trigger/${trigger._id}`).then((response) =>
        {
            this.props.onTriggerDeleted(index);
        });

        evt.stopPropagation();
    }

    render()
    {
        const tableData = this.prepareDataForTable(this.props.data)

        return(
            <div>
                <MaterialTable
                    columns={[
                        { title: 'id', field: '_id', hidden: true },
                        { title: 'Trigger', field: 'repeatTrigger' },
                        { title: 'Last Trigger Time', field: 'lastTriggerTimeFormatted' },
                        {
                            field: 'url',
                            title: 'Actions',
                            render: (rowData) => <Button variant="contained" size="small" color="secondary" onClick={(evt) => this.deleteTriggerClicked(evt, rowData)}>
                                <Icon>delete</Icon>
                            </Button>
                        }
                    ]}
                    data={tableData}
                    title=""
                    onRowClick={(event, rowData) => this.handleRowClick(event, rowData)}
                    options={{
                        pageSize:10,
                        pageSizeOptions:[10,20,50],
                        rowStyle: {
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "normal",wordWrap: "break-word",
                            fontSize:"14px"
                        }
                    }}
                />
            </div>
        )
    }
}
const mapStateToProps = (state) => {return { ...state.RecurringTestingTriggersTable} };
export default connect(mapStateToProps)(RecurringTestingTriggersTable);
