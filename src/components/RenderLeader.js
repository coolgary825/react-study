import React from 'react';
import { Media } from 'reactstrap';

function RenderLeader({leader}) {
    return(
        <Media tag="li" className="mt-5">
          <Media left href="#" className="mr-4">
            <Media object src={leader.image} alt={leader.name} />
          </Media>
          <Media body>
            <Media heading >
              {leader.name}
            </Media>
            <p>{leader.designation}</p>
            <p className="mt-2">{leader.description}</p>
          </Media>
        </Media>
      );
}

export default RenderLeader;