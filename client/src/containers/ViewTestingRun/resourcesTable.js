import React, { Component } from 'react';
import {connect, Provider} from 'react-redux';
import {Table} from "../ListApplications/materialUiTables.style";
import {TableBody, TableCell, TableHead, TableRow, TablePagination} from "../../components/uielements/table";
import moment from 'moment';
import MaterialTable from 'material-table'
import "./resourcesTable.scss";
import Papersheet from "../../components/utility/papersheet/papersheet.style";
import ArrowBackIosIcon from '@material-ui/icons/ArrowBackIos';
import ArrowForwardIosIcon from '@material-ui/icons/ArrowForwardIos';
import FastForwardIcon from '@material-ui/icons/FastForward';
import SkipNextIcon from '@material-ui/icons/SkipNext';
import SkipPreviousIcon from '@material-ui/icons/SkipPrevious';

class ResourceTable extends Component{
    state = {
        page:0,
        rowsPerPage:10,

    };

    firstPage()
    {
        this.setState({page: 0});
    }

    lastPage()
    {
        this.setState({page: Math.floor(this.props.data.length / this.state.rowsPerPage)});
    }

    nextPage()
    {
        if (this.state.page < Math.floor(this.props.data.length / this.state.rowsPerPage))
        {
            this.setState({page: this.state.page + 1});
        }
    }

    previousPage()
    {
        if (this.state.page > 0)
        {
            this.setState({page: this.state.page - 1});
        }
    }

    onRowClicked(rowData)
    {
        this.props.onResourceSelected(rowData);
    }

    getDomainForURL(data) {
        var    a      = document.createElement('a');
        a.href = data;
        return a.hostname;
    }

    getPathForURL(data) {
        var    a      = document.createElement('a');
        a.href = data;
        return a.pathname;
    }

    render()
    {
        const rowsPerPage = this.state.rowsPerPage;
        const page = this.state.page;
        let tableData = this.props.data;
        let pageData = tableData.slice(rowsPerPage * page, rowsPerPage * (page + 1));

        if (page * rowsPerPage > tableData.length)
        {
            this.lastPage();
        }

        return(
            <Papersheet className={"resources-table-wrapper"}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Method</TableCell>
                            <TableCell>Domain</TableCell>
                            <TableCell>Canonical Path</TableCell>
                            <TableCell>Content Type</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {pageData.map(n => {
                            return (
                                <TableRow key={n._id} className={`resource-row ${this.props.selectedResource && this.props.selectedResource._id === n._id ? "selected" : ""}`} onClick={() => this.onRowClicked(n)}>
                                    <TableCell>
                                        {(n.methods || ["GET"]).map((method) =>
                                            {
                                                return <span className={"resource-request-method"}>{method}</span>;
                                            })
                                        }
                                    </TableCell>
                                    <TableCell>{this.getDomainForURL(n.canonicalUrl)}</TableCell>
                                    <TableCell>{this.getPathForURL(n.canonicalUrl)}</TableCell>
                                    <TableCell>{n.contentType}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>

                <div className={"resources-table-controls"}>
                    <div className={"resources-table-paging-widget"}>
                        <div onClick={() => this.firstPage()} className={"resources-table-icon-wrapper"}>
                            <SkipPreviousIcon />
                        </div>
                        <div onClick={() => this.previousPage()} className={"resources-table-icon-wrapper"}>
                            <ArrowBackIosIcon />
                        </div>
                        <span>{page * rowsPerPage + 1} - {(page + 1) * rowsPerPage} of {tableData.length}</span>
                        <div onClick={() => this.nextPage()} className={"resources-table-icon-wrapper"}>
                            <ArrowForwardIosIcon />
                        </div>
                        <div onClick={() => this.lastPage()} className={"resources-table-icon-wrapper"}>
                            <SkipNextIcon />
                        </div>
                    </div>
                </div>
            </Papersheet>
        )
    }
}
const mapStateToProps = (state) => {return { ...state.ResourceTable} };
export default connect(mapStateToProps)(ResourceTable);