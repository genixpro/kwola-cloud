import React, { Component } from 'react';
import {connect, Provider} from 'react-redux';
import {Table} from "../ListApplications/materialUiTables.style";
import {TableBody, TableCell, TableHead, TableRow, TablePagination} from "../../components/uielements/table";
import moment from 'moment';
import MaterialTable from 'material-table'

class TestingRunsTable extends Component{
	state = {
        newPage:0,
        setPage:0,
        rowsPerPage:10
    };

    handleRowClick = (event, rowData)=>
	{
    	this.props.history.push(`/app/dashboard/testing_runs/${rowData._id}`)
    }

    processData(data)
	{
    	let rdata = []
    	if(data){
    		data.map(testingRun=>{
	    		testingRun.humanFriendlyStatus = this.getHumanFriendlyStatusText(testingRun.status);
	    		testingRun.startTimeFormatted = testingRun.startTime ? moment(new Date(testingRun.startTime.$date)).format('HH:mm MMM Do') : null
	    		rdata.push(testingRun)
	    	})
    	}
    	return rdata;
    }


	getHumanFriendlyStatusText(status)
	{
		if (status === "running" || status === "created")
		{
			return "in progress";
		}
		else
		{
			return status;
		}
	}

	render()
	{
		const rowsPerPage = this.state.rowsPerPage;
        const setRowsPerPage = 10;
        const page = this.state.newPage
        let setPage = this.state.setPage
        let tableData = this.processData(this.props.data);
	 	return(
	 		<div>
		     	<MaterialTable
		          columns={[
		            { title: 'Start Time', field: 'startTimeFormatted' },
		            { title: 'Status', field: 'humanFriendlyStatus' },
		            { title: 'Bugs Found', field: 'bugsFound' },
		            { title: 'id', field: '_id', hidden:true },
		          ]}
		          data={tableData}
		          title=""
		          onRowClick={this.handleRowClick}
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
const mapStateToProps = (state) => {return { ...state.TestingRunsTable} };
export default connect(mapStateToProps)(TestingRunsTable);