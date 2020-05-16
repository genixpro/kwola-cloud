import React, {Component} from 'react';
import LayoutWrapper from '../components/utility/layoutWrapper';
import Papersheet from '../components/utility/papersheet';
import { FullColumn } from '../components/utility/rowColumn';
import IntlMessages from '../components/utility/intlMessages';
import axios from "axios";

class Dashboard extends Component {
	constructor() {
		super();
	}

	componentDidMount()
	{
		axios.get("/application").then((response) => {
			if (response.data.applications.length === 0) {
				this.props.history.push(`/app/dashboard/new-application`);
			} else if (response.data.applications.length === 1) {
				this.props.history.push(`/app/dashboard/applications/${response.data.applications[0]._id}`)
			} else {
				this.props.history.push(`/app/dashboard/applications/`)
			}
		})
	}

	render()
	{
		return <LayoutWrapper>
			<FullColumn>
			</FullColumn>
		</LayoutWrapper>
	}
}

export default Dashboard;

