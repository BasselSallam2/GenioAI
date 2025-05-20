pipeline {
    agent any
    environment {
        IMAGE_NAME            = 'innocode21/genio-backend'
        VERSION_FILE          = "${env.JENKINS_HOME}/backend_version.txt"
        K8S_DEPLOYMENT_REPO   = 'git@github.com:inno-code-AI/Genio_DevOps.git'
        K8S_FOLDER            = 'k8s-Dir'
        DEPLOYMENT_FILE       = 'backend-deployment.yaml'
        DOCKER_CREDENTIALS_ID = 'docker-hub-creds'
        GITHUB_CREDENTIALS_ID = 'github-cred'
        BACKEND               = 'backend'
    }

    stages {
        stage('Initialize Version') {
            steps {
                script {
                    def versionInfo = fileExists(env.VERSION_FILE) ? 
                        readFile(env.VERSION_FILE).trim().tokenize('.').collect { it.toInteger() } : 
                        [1, 0, 0]
                    
                    def (major, minor, build) = versionInfo
                    build++
                    (major, minor, build) = build > 10 ? [major, minor+1, 1] : [major, minor, build]
                    
                    env.TAG = "v${major}.${minor}.${build}"
                    env.NEXT_VERSION = "${major}.${minor}.${build}"
                    
                    slackSend(
                        channel: 'genio_pipeline',
                        color: '#439FE0',
                        message: "🚀 Starting Backend Pipeline for version ${env.TAG}"
                    )
                }
            }
        }

        stage('Detect Changes') {
            when {
                anyOf {
                    changeset "Jenkinsfile"
                    changeset "**/*.js"
                    changeset "Dockerfile"
                }
            }
            steps {
                script {
                    def changes = sh(
                        script: "git diff HEAD~1 --name-only",
                        returnStdout: true
                    ).trim()
                    
                    slackSend(
                        channel: 'genio_pipeline',
                        color: 'warning',
                        message: "Detected changes in Backend components:",
                        attachments: [[
                            text: "```${changes}```"
                        ]]
                    )
                }
            }
        }

        stage('Build Approval') {
            when {
                anyOf {
                    changeset "Jenkinsfile"
                    changeset "**/*.java"
                    changeset "Dockerfile"
                }
            }
            steps {
                script {
                    def inputUrl = "${env.BUILD_URL}input"
                    
                    slackSend(
                        channel: 'genio_pipeline',
                        color: '#ffd700',
                        message: "🚀 Backend Deployment Review Needed",
                        attachments: [[
                            color: '#ffd700',
                            text: "Version *${env.TAG}* is ready for review",
                            fields: [
                                [title: 'Commit Author', value: env.GIT_AUTHOR_NAME ?: 'Unknown', short: true],
                                [title: 'Changed Files', value: "${env.CHANGES}", short: false]
                            ],
                            actions: [
                                [type: 'button', text: '✅ Approve', url: inputUrl, style: 'primary'],
                                [type: 'button', text: '❌ Reject', url: inputUrl, style: 'danger']
                            ]
                        ]]
                    )
                    
                    def approval = input(
                        id: 'BuildApproval',
                        message: "Approve deployment of backend ${env.TAG}?",
                        submitterParameter: 'approver',
                        parameters: [
                            choice(
                                name: 'ACTION',
                                choices: ['APPROVE', 'REJECT'],
                                description: 'Approve or Reject the build'
                            )
                        ]
                    )

                    if (approval.ACTION == 'REJECT') {
                        currentBuild.result = 'ABORTED'
                        error("Deployment rejected by ${approval.approver}")
                    }
                }
            }
        }

        stage('Build and Push') {
            steps {
                slackSend(
                    channel: 'genio_pipeline',
                    color: '#439FE0',
                    message: "🏗 Building Backend Image ${env.TAG}"
                )
                
                withDockerRegistry([credentialsId: env.DOCKER_CREDENTIALS_ID, url: '']) {
                    sh "docker build -t ${env.IMAGE_NAME}:${env.TAG} ."
                    sh "docker push ${env.IMAGE_NAME}:${env.TAG}"
                }
                writeFile file: env.VERSION_FILE, text: env.NEXT_VERSION
            }
        }

        stage('Update K8s Manifests') {
            steps {
                slackSend(
                    channel: 'genio_pipeline',
                    color: '#439FE0',
                    message: "⚙️ Updating Kubernetes Manifests for Backend"
                )
                
                sshagent([env.GITHUB_CREDENTIALS_ID]) {
                    dir('devops-repo') {
                        git(
                            url: env.K8S_DEPLOYMENT_REPO,
                            branch: 'main',
                            credentialsId: env.GITHUB_CREDENTIALS_ID
                        )
                        sh """
                            sed -i 's|image: ${env.IMAGE_NAME}:.*|image: ${env.IMAGE_NAME}:${env.TAG}|' \
                            ${env.K8S_FOLDER}/${env.BACKEND}/${env.DEPLOYMENT_FILE}
                        """
                        sh """
                            git config user.email "jenkins@example.com"
                            git config user.name "Jenkins CI"
                            git add ${env.K8S_FOLDER}/${env.DEPLOYMENT_FILE}
                            git commit -m 'Backend: Update to ${env.TAG}'
                            git push origin main
                        """
                    }
                }
            }
        }

        stage('Deployment Notification') {
            steps {
                slackSend(
                    channel: 'genio_pipeline',
                    color: 'good',
                    message: "✅ Successfully deployed Backend ${env.TAG}",
                    attachments: [[
                        fields: [
                            [title: 'Docker Image', value: "${env.IMAGE_NAME}:${env.TAG}", short: true],
                            [title: 'K8s Manifest', value: "${env.K8S_FOLDER}/${env.DEPLOYMENT_FILE}", short: true]
                        ]
                    ]]
                )
            }
        }
    }

    post {
        always {
            cleanWs()
            script {
                def status = currentBuild.currentResult ?: 'SUCCESS'
                def (color, icon) = [
                    'SUCCESS': ['#36a64f', '✅'],
                    'ABORTED': ['#ffd700', '⚠️'], 
                    'FAILURE': ['#ff0000', '❌']
                ][status]

                slackSend(
                    channel: 'genio_pipeline',
                    color: color,
                    message: "${icon} Backend Pipeline ${status}: ${env.TAG}",
                    attachments: [[
                        fields: [
                            [title: 'Duration', value: "${currentBuild.durationString}", short: true],
                            [title: 'Build Number', value: "#${env.BUILD_NUMBER}", short: true],
                            [title: 'Details', value: "<${env.BUILD_URL}|View Build>", short: false]
                        ]
                    ]]
                )
            }
        }
    }
}
