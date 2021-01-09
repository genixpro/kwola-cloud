import React, { Component } from 'react';
import {connect, Provider} from 'react-redux';
import {Table} from "../ListApplications/materialUiTables.style";
import {TableBody, TableCell, TableHead, TableRow, TablePagination} from "../../components/uielements/table";
import moment from 'moment';
import MaterialTable from 'material-table'

class ResourceTable extends Component{
    state = {
        newPage:0,
        setPage:0,
        rowsPerPage:10
    };

    handleRowClick = (event, rowData)=>
    {
        this.props.history.push(`/app/dashboard/resources/${rowData._id}`)
    }

    render()
    {
        const rowsPerPage = this.state.rowsPerPage;
        const setRowsPerPage = 10;
        const page = this.state.newPage
        let setPage = this.state.setPage
        let tableData = this.props.data;
        return(
            <div>
                <MaterialTable
                    columns={[
                        { title: 'Canonical URL', field: 'canonicalUrl' },
                        { title: 'Content Type', field: 'contentType' },
                        { title: 'id', field: '_id', hidden:true },
                    ]}
                    data={tableData}
                    title=""
                    onRowClick={this.handleRowClick}
                    options={{
                        pageSize:10,
                        pageSizeOptions:[10,20,50],
                        rowStyle: {
                            fontSize:"14px"
                        }
                    }}
                />
            </div>
        )
    }
}
const mapStateToProps = (state) => {return { ...state.ResourceTable} };
export default connect(mapStateToProps)(ResourceTable);