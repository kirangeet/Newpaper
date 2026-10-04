// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ManuscriptProvenance {
    struct Project {
        address owner;
        bytes32 titleCommitment;
        bytes32 headHash;
        uint64 revisionCount;
    }

    struct Revision {
        bytes32 contentHash;
        bytes32 parentHash;
        address submittedBy;
        uint64 committedAt;
    }

    uint256 public nextProjectId = 1;
    mapping(uint256 => Project) public projects;
    mapping(uint256 => mapping(address => bool)) public members;
    mapping(uint256 => mapping(uint64 => Revision)) public revisions;
    mapping(uint256 => mapping(uint64 => mapping(address => bool))) public hasAttested;
    mapping(uint256 => mapping(uint64 => uint32)) public attestationCount;

    error ProjectNotFound();
    error NotProjectOwner();
    error NotProjectMember();
    error InvalidCommitment();
    error StaleParent(bytes32 expected, bytes32 actual);
    error RevisionNotFound();
    error AlreadyAttested();

    event ProjectCreated(uint256 indexed projectId, address indexed owner, bytes32 titleCommitment);
    event MemberAdded(uint256 indexed projectId, address indexed member);
    event RevisionCommitted(
        uint256 indexed projectId,
        uint64 indexed revisionId,
        bytes32 contentHash,
        bytes32 parentHash,
        address indexed submittedBy,
        uint64 committedAt
    );
    event ContributionAttested(uint256 indexed projectId, uint64 indexed revisionId, address indexed contributor);

    modifier projectExists(uint256 projectId) {
        if (projects[projectId].owner == address(0)) revert ProjectNotFound();
        _;
    }

    modifier onlyMember(uint256 projectId) {
        if (!members[projectId][msg.sender]) revert NotProjectMember();
        _;
    }

    function createProject(bytes32 titleCommitment, address[] calldata coauthors)
        external
        returns (uint256 projectId)
    {
        if (titleCommitment == bytes32(0)) revert InvalidCommitment();

        projectId = nextProjectId++;
        projects[projectId].owner = msg.sender;
        projects[projectId].titleCommitment = titleCommitment;
        members[projectId][msg.sender] = true;
        emit ProjectCreated(projectId, msg.sender, titleCommitment);
        emit MemberAdded(projectId, msg.sender);

        for (uint256 i = 0; i < coauthors.length; i++) {
            _addMember(projectId, coauthors[i]);
        }
    }

    function addMember(uint256 projectId, address member) external projectExists(projectId) {
        if (msg.sender != projects[projectId].owner) revert NotProjectOwner();
        _addMember(projectId, member);
    }

    function commitRevision(uint256 projectId, bytes32 contentHash, bytes32 expectedParentHash)
        external
        projectExists(projectId)
        onlyMember(projectId)
        returns (uint64 revisionId)
    {
        if (contentHash == bytes32(0)) revert InvalidCommitment();
        Project storage project = projects[projectId];
        if (expectedParentHash != project.headHash) {
            revert StaleParent(expectedParentHash, project.headHash);
        }

        revisionId = ++project.revisionCount;
        revisions[projectId][revisionId] = Revision({
            contentHash: contentHash,
            parentHash: project.headHash,
            submittedBy: msg.sender,
            committedAt: uint64(block.timestamp)
        });
        project.headHash = contentHash;

        emit RevisionCommitted(
            projectId,
            revisionId,
            contentHash,
            expectedParentHash,
            msg.sender,
            uint64(block.timestamp)
        );
    }

    function attestContribution(uint256 projectId, uint64 revisionId)
        external
        projectExists(projectId)
        onlyMember(projectId)
    {
        if (revisionId == 0 || revisionId > projects[projectId].revisionCount) revert RevisionNotFound();
        if (hasAttested[projectId][revisionId][msg.sender]) revert AlreadyAttested();

        hasAttested[projectId][revisionId][msg.sender] = true;
        attestationCount[projectId][revisionId]++;
        emit ContributionAttested(projectId, revisionId, msg.sender);
    }

    function _addMember(uint256 projectId, address member) private {
        if (member == address(0)) revert InvalidCommitment();
        if (!members[projectId][member]) {
            members[projectId][member] = true;
            emit MemberAdded(projectId, member);
        }
    }
}